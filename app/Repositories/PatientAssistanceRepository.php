<?php

namespace App\Repositories;

use App\Models\PatientAssistance;
use App\Repositories\Contracts\PatientAssistanceRepositoryInterface;

class PatientAssistanceRepository extends BaseRepository implements PatientAssistanceRepositoryInterface
{
    /** @var list<string> */
    protected array $searchable = ['notes'];

    /** @var list<string> */
    protected array $filterable = ['status', 'case_id', 'assistant_type_id', 'guarantor_id'];

    /** @var list<string> */
    protected array $sortable = ['date_given', 'amount', 'status', 'created_at'];

    protected string $defaultSort = 'created_at';

    protected string $defaultDirection = 'desc';

    /** @var list<string> */
    protected array $listWith = ['assistantType', 'guarantor'];

    public function __construct(PatientAssistance $model)
    {
        parent::__construct($model);
    }
}
