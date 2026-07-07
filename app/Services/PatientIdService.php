<?php

namespace App\Services;

use App\DTOs\PatientIdDto;
use App\Models\PatientId;
use App\Repositories\Contracts\PatientIdRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class PatientIdService
{
    public function __construct(protected PatientIdRepositoryInterface $repository)
    {
    }

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function find(int|string $id): PatientId
    {
        return $this->repository->findOrFail($id);
    }

    public function create(PatientIdDto $dto): PatientId
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(PatientId $patientId, PatientIdDto $dto): PatientId
    {
        return $this->repository->update($patientId, $dto->toArray());
    }

    public function delete(PatientId $patientId): bool
    {
        return $this->repository->delete($patientId);
    }
}
