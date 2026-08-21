<?php

namespace App\Repositories;

use App\Models\UnifiedIntakeSheet;
use App\Repositories\Contracts\UnifiedIntakeSheetRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class UnifiedIntakeSheetRepository extends BaseRepository implements UnifiedIntakeSheetRepositoryInterface
{
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
