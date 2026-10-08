<?php

namespace App\Services;

use App\Models\Bizbox\HospitalPatient;
use App\Models\Patient;
use App\Repositories\Contracts\HospitalPatientRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Pagination\LengthAwarePaginator as Paginator;
use Illuminate\Support\Collection as SupportCollection;

class HospitalPatientService
{
    public function __construct(protected HospitalPatientRepositoryInterface $repository) {}

    /**
     * A page of HIS patients for the API search, each with its `localPatient`
     * relation set (null when not in the MSWD registry) so the client can offer
     * Open instead of Import.
     */
    public function paginate(?string $search = null, int $perPage = 15): LengthAwarePaginator
    {
        $page = $this->repository->paginate($search, $perPage);

        $this->attachLocalPatients($page->getCollection());

        return $page;
    }

    /**
     * Resolve which HIS patients are already registered locally, in one query
     * keyed on hospital_id (= HIS patid). A soft-deleted local patient counts
     * as not registered: importing restores it.
     *
     * @param  SupportCollection<int, HospitalPatient>  $hospitalPatients
     */
    public function attachLocalPatients(SupportCollection $hospitalPatients): void
    {
        $patids = $hospitalPatients->pluck('patid')->filter(fn ($patid) => filled($patid))->unique()->values();

        $locals = $patids->isEmpty()
            ? collect()
            : Patient::query()
                ->whereIn('hospital_id', $patids->all())
                ->get(['id', 'hospital_id'])
                ->keyBy(fn (Patient $patient) => (string) $patient->hospital_id);

        $hospitalPatients->each(fn (HospitalPatient $hospitalPatient) => $hospitalPatient->setRelation(
            'localPatient',
            $locals->get((string) $hospitalPatient->patid),
        ));
    }

    /**
     * A page of HIS patients for the read-only Filament browse table.
     *
     * Returns an empty page rather than throwing when the HIS is unreachable:
     * the SQL Server is down on every development machine and can blink in
     * production, and the browse list must render empty, not 500.
     */
    public function paginateForPanel(?string $search, int $perPage, int $page): LengthAwarePaginator
    {
        try {
            return $this->repository->paginate($search, $perPage, $page);
        } catch (QueryException $e) {
            report($e);

            return new Paginator([], 0, $perPage, $page);
        }
    }

    public function find(int|string $id): HospitalPatient
    {
        return $this->repository->find($id)
            ?? throw (new ModelNotFoundException)->setModel(HospitalPatient::class, [$id]);
    }

    /**
     * A single HIS patient with personal data and transactions (+guarantors) in
     * one read (404 when the id matches no patient).
     */
    public function findWithTransactions(int|string $id): HospitalPatient
    {
        return $this->repository->findWithTransactions($id)
            ?? throw (new ModelNotFoundException)->setModel(HospitalPatient::class, [$id]);
    }

    /**
     * Candidate HIS patients for a one-box search (name or hospital number).
     */
    public function search(string $term, int $limit = 20): Collection
    {
        return $this->repository->search($term, $limit);
    }

    /**
     * Find patients by name and/or hospital number (404 when none match).
     */
    public function findByNameAndHospitalNumber(?string $name = null, int|string|null $hospitalNumber = null): Collection
    {
        $patients = $this->repository->findByNameAndHospitalNumber($name, $hospitalNumber);

        if ($patients->isEmpty()) {
            throw (new ModelNotFoundException)->setModel(HospitalPatient::class);
        }

        return $patients;
    }
}
