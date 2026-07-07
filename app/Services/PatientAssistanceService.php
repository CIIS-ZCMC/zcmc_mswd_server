<?php

namespace App\Services;

use App\DTOs\PatientAssistanceDto;
use App\Models\PatientAssistance;
use App\Repositories\Contracts\PatientAssistanceRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class PatientAssistanceService
{
    public function __construct(protected PatientAssistanceRepositoryInterface $repository)
    {
    }

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function find(int|string $id): PatientAssistance
    {
        return $this->repository->findOrFail($id);
    }

    public function create(PatientAssistanceDto $dto): PatientAssistance
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(PatientAssistance $patientAssistance, PatientAssistanceDto $dto): PatientAssistance
    {
        return $this->repository->update($patientAssistance, $dto->toArray());
    }

    public function delete(PatientAssistance $patientAssistance): bool
    {
        return $this->repository->delete($patientAssistance);
    }
}
