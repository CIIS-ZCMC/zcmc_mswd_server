<?php

namespace App\Services;

use App\Models\Bizbox\HospitalPatient;
use App\Repositories\Contracts\HospitalPatientRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class HospitalPatientService
{
    public function __construct(protected HospitalPatientRepositoryInterface $repository) {}

    public function paginate(?string $search = null, int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($search, $perPage);
    }

    public function find(int|string $id): HospitalPatient
    {
        return $this->repository->find($id)
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
