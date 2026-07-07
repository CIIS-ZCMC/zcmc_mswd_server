<?php

namespace App\Repositories;

use App\Models\CaseActivity;
use App\Repositories\Contracts\CaseActivityRepositoryInterface;

class CaseActivityRepository extends BaseRepository implements CaseActivityRepositoryInterface
{
    public function __construct(CaseActivity $model)
    {
        parent::__construct($model);
    }
}
