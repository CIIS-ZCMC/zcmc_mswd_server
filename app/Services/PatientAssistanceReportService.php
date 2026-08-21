<?php

namespace App\Services;

use App\Models\PatientAssistanceReport;
use App\Repositories\Contracts\PatientAssistanceReportRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class PatientAssistanceReportService
{
    public function __construct(protected PatientAssistanceReportRepositoryInterface $repository) {}

    public function list(int $page = 1, int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($page, $perPage);
    }

    public function find(int|string $id): PatientAssistanceReport
    {
        return $this->repository->findOrFail($id);
    }

    /**
     * Void a report (e.g. issued in error) without removing the audit record.
     */
    public function void(PatientAssistanceReport $report): PatientAssistanceReport
    {
        return $this->repository->update($report, ['is_void' => true]);
    }
}
