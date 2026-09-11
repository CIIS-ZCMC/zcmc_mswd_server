<?php

namespace App\Repositories;

use App\Models\AssessmentExpense;
use App\Repositories\Contracts\AssessmentExpenseRepositoryInterface;

class AssessmentExpenseRepository extends BaseRepository implements AssessmentExpenseRepositoryInterface
{
    public function __construct(AssessmentExpense $model)
    {
        parent::__construct($model);
    }
}
