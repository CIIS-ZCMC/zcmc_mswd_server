<?php

namespace App\Services;

use App\DTOs\PatientAssistanceReportDto;
use App\Models\PatientAssistanceReport;
use App\Repositories\Contracts\PatientAssistanceReportRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class PatientAssistanceReportService
{
    public function __construct(protected PatientAssistanceReportRepositoryInterface $repository)
    {
    }

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function find(int|string $id): PatientAssistanceReport
    {
        return $this->repository->findOrFail($id);
    }

    public function create(PatientAssistanceReportDto $dto): PatientAssistanceReport
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(PatientAssistanceReport $patientAssistanceReport, PatientAssistanceReportDto $dto): PatientAssistanceReport
    {
        return $this->repository->update($patientAssistanceReport, $dto->toArray());
    }

    public function delete(PatientAssistanceReport $patientAssistanceReport): bool
    {
        return $this->repository->delete($patientAssistanceReport);
    }
}
