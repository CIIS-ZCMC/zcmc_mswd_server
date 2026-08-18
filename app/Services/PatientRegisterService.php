<?php

namespace App\Services;

use App\Models\Bizbox\PatientRegister;
use App\Repositories\Contracts\PatientRegisterRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class PatientRegisterService
{
    public function __construct(protected PatientRegisterRepositoryInterface $repository) {}

    public function paginate(?string $search = null, ?string $date = null, int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($search, $date, $perPage);
    }

    public function find(int|string $id): PatientRegister
    {
        return $this->repository->find($id)
            ?? throw (new ModelNotFoundException)->setModel(PatientRegister::class, [$id]);
    }

    /**
     * Candidate HIS registrations for a one-box search (name or hospital number),
     * optionally narrowed to a single registration date.
     */
    public function search(string $term, ?string $date = null, int $limit = 20): Collection
    {
        return $this->repository->search($term, $date, $limit);
    }

    /**
     * Find registrations by name and/or hospital number (404 when none match),
     * optionally narrowed to a single registration date.
     */
    public function findByNameAndHospitalNumber(?string $name = null, int|string|null $hospitalNumber = null, ?string $date = null): Collection
    {
        $registrations = $this->repository->findByNameAndHospitalNumber($name, $hospitalNumber, $date);

        if ($registrations->isEmpty()) {
            throw (new ModelNotFoundException)->setModel(PatientRegister::class);
        }

        return $registrations;
    }
}
