<?php

namespace App\Services;

use App\Models\HospitalPatient;
use App\Repositories\Contracts\HospitalPatientRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class HospitalPatientService
{
    public function __construct(protected HospitalPatientRepositoryInterface $repository) {}

    /**
     * @return Collection<int, HospitalPatient>
     */
    public function get(?string $search = null, int $limit = 100): Collection
    {
        return $this->repository->get($search, $limit);
    }

    public function find(int|string $id): HospitalPatient
    {
        return $this->repository->find($id)
            ?? throw (new ModelNotFoundException)->setModel(HospitalPatient::class, [$id]);
    }
}
