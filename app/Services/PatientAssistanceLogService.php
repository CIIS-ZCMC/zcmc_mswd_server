<?php

namespace App\Services;

use App\DTOs\PatientAssistanceLogDto;
use App\Models\PatientAssistanceLog;
use App\Repositories\Contracts\PatientAssistanceLogRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class PatientAssistanceLogService
{
    public function __construct(protected PatientAssistanceLogRepositoryInterface $repository)
    {
    }

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function find(int|string $id): PatientAssistanceLog
    {
        return $this->repository->findOrFail($id);
    }

    public function create(PatientAssistanceLogDto $dto): PatientAssistanceLog
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(PatientAssistanceLog $patientAssistanceLog, PatientAssistanceLogDto $dto): PatientAssistanceLog
    {
        return $this->repository->update($patientAssistanceLog, $dto->toArray());
    }

    public function delete(PatientAssistanceLog $patientAssistanceLog): bool
    {
        return $this->repository->delete($patientAssistanceLog);
    }
}
