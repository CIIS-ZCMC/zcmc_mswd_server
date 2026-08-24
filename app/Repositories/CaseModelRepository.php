<?php

namespace App\Repositories;

use App\Models\CaseModel;
use App\Repositories\Contracts\CaseModelRepositoryInterface;

class CaseModelRepository extends BaseRepository implements CaseModelRepositoryInterface
{
    /** @var list<string> */
    protected array $searchable = ['case_code', 'patient.last_name', 'patient.first_name'];

    /** @var list<string> */
    protected array $filterable = ['status', 'case_type', 'priority_level', 'assigned_user_id', 'patient_id'];

    /** @var list<string> */
    protected array $sortable = ['case_code', 'date_opened', 'status', 'priority_level', 'created_at'];

    protected string $defaultSort = 'date_opened';

    protected string $defaultDirection = 'desc';

    /** @var list<string> */
    protected array $listWith = ['patient', 'assignedUser'];

    public function __construct(CaseModel $model)
    {
        parent::__construct($model);
    }
}
