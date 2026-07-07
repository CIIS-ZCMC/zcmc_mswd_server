<?php

namespace App\Services;

use App\DTOs\PatientDto;
use App\Models\Patient;
use App\Repositories\Contracts\PatientRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class PatientService
{
    public function __construct(protected PatientRepositoryInterface $repository)
    {
    }

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function find(int|string $id): Patient
    {
        return $this->repository->findOrFail($id);
    }

    public function create(PatientDto $dto): Patient
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(Patient $patient, PatientDto $dto): Patient
    {
        return $this->repository->update($patient, $dto->toArray());
    }

    public function delete(Patient $patient): bool
    {
        return $this->repository->delete($patient);
    }
}
