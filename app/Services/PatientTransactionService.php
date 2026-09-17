<?php

namespace App\Services;

use App\Models\Bizbox\PatientTransaction;
use App\Repositories\Contracts\HospitalPatientRepositoryInterface;
use App\Repositories\Contracts\PatientTransactionRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;

class PatientTransactionService
{
    public function __construct(
        protected PatientTransactionRepositoryInterface $repository,
        protected HospitalPatientRepositoryInterface $hospitalPatients,
    ) {}

    public function paginate(?string $search = null, ?string $date = null, int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($search, $date, $perPage);
    }

    public function find(int|string $id): PatientTransaction
    {
        return $this->repository->find($id)
            ?? throw (new ModelNotFoundException)->setModel(PatientTransaction::class, [$id]);
    }

    /**
     * Candidate HIS transactions for a one-box search (name or hospital number),
     * optionally narrowed to a single registration date.
     */
    public function search(string $term, ?string $date = null, int $limit = 20): Collection
    {
        return $this->repository->search($term, $date, $limit);
    }

    /**
     * Find transactions by name and/or hospital number (404 when none match),
     * optionally narrowed to a single registration date.
     */
    public function findByNameAndHospitalNumber(?string $name = null, int|string|null $hospitalNumber = null, ?string $date = null): Collection
    {
        $transactions = $this->repository->findByNameAndHospitalNumber($name, $hospitalNumber, $date);

        if ($transactions->isEmpty()) {
            throw (new ModelNotFoundException)->setModel(PatientTransaction::class);
        }

        return $transactions;
    }

    /**
     * Every transaction belonging to one HIS patient, newest first.
     *
     * Takes the HIS surrogate key (emdPatients.PK_emdPatients). Callers holding
     * a local patient have a hospital number instead — use forHospitalNumber().
     */
    public function getByPatientId(int $patientId): Collection
    {
        return $this->repository->getByPatientId($patientId);
    }

    /**
     * Transactions for a hospital number (emdPatients.patid) — the value a local
     * `patients.hospital_id` row holds, which is NOT the key the transaction
     * table joins on. Resolves the number to the HIS surrogate key first, at the
     * cost of one extra SQL Server query.
     *
     * Returns an empty collection rather than throwing on every miss: an unknown
     * number, a patient with no visits, and an unreachable HIS are all ordinary
     * on a screen that merely displays visits alongside other patient detail.
     */
    public function forHospitalNumber(int|string|null $hospitalNumber): Collection
    {
        if (blank($hospitalNumber)) {
            return new Collection;
        }

        try {
            $patient = $this->hospitalPatients
                ->findByNameAndHospitalNumber(null, $hospitalNumber)
                ->first();

            return $patient === null
                ? new Collection
                : $this->repository->getByPatientId($patient->getKey());
        } catch (QueryException $e) {
            // The hospital's SQL Server is unreachable on every development
            // machine and can blink in production. Logged, not surfaced — a
            // patient page must not 500 because the HIS is down.
            report($e);

            return new Collection;
        }
    }
}
