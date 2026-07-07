<?php

namespace App\Repositories;

use App\Models\CaseModel;
use App\Repositories\Contracts\CaseModelRepositoryInterface;

class CaseModelRepository extends BaseRepository implements CaseModelRepositoryInterface
{
    public function __construct(CaseModel $model)
    {
        parent::__construct($model);
    }
}
