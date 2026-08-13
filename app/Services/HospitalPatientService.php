<?php

namespace App\Services;

use App\Models\HospitalPatient;
use App\Repositories\Contracts\HospitalPatientRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
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
     * Find one patient by name and/or hospital number (404 when none match).
     */
    public function findByNameAndHospitalNumber(?string $name = null, int|string|null $hospitalNumber = null): HospitalPatient
    {
        return $this->repository->findByNameAndHospitalNumber($name, $hospitalNumber)
            ?? throw (new ModelNotFoundException)->setModel(HospitalPatient::class);
    }
}
