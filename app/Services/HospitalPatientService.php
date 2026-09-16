<?php

namespace App\Services;

use App\Models\Bizbox\HospitalPatient;
use App\Repositories\Contracts\HospitalPatientRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Pagination\LengthAwarePaginator as Paginator;

class HospitalPatientService
{
    public function __construct(protected HospitalPatientRepositoryInterface $repository) {}

    public function paginate(?string $search = null, int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($search, $perPage);
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
