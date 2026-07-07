<?php

namespace App\Services;

use App\DTOs\DiagnosticReportDto;
use App\Models\DiagnosticReport;
use App\Repositories\Contracts\DiagnosticReportRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class DiagnosticReportService
{
    public function __construct(protected DiagnosticReportRepositoryInterface $repository)
    {
    }

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function find(int|string $id): DiagnosticReport
    {
        return $this->repository->findOrFail($id);
    }

    public function create(DiagnosticReportDto $dto): DiagnosticReport
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(DiagnosticReport $diagnosticReport, DiagnosticReportDto $dto): DiagnosticReport
    {
        return $this->repository->update($diagnosticReport, $dto->toArray());
    }

    public function delete(DiagnosticReport $diagnosticReport): bool
    {
        return $this->repository->delete($diagnosticReport);
    }
}
