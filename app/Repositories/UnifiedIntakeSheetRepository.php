<?php

namespace App\Repositories;

use App\Models\UnifiedIntakeSheet;
use App\Repositories\Contracts\UnifiedIntakeSheetRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class UnifiedIntakeSheetRepository extends BaseRepository implements UnifiedIntakeSheetRepositoryInterface
{
    /** @var list<string> */
    protected array $searchable = ['intake_no', 'patient.last_name', 'patient.first_name'];

    /** @var list<string> */
    protected array $filterable = ['status', 'patient_id', 'case_id', 'intake_worker_id'];

    /** @var list<string> */
    protected array $sortable = ['intake_no', 'date_of_intake', 'status', 'created_at'];

    protected string $defaultSort = 'created_at';

    protected string $defaultDirection = 'desc';

    /** @var list<string> */
    protected array $listWith = ['patient', 'intakeWorker'];

    public function __construct(UnifiedIntakeSheet $model)
    {
        parent::__construct($model);
    }

    public function paginate(int $page = 1, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->newQuery()
            ->with(['patient', 'case', 'intakeWorker'])
            ->latest()
            ->paginate(perPage: $perPage, page: $page);
    }
}
