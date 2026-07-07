<?php

namespace App\Repositories;

use App\Models\Intervention;
use App\Repositories\Contracts\InterventionRepositoryInterface;

class InterventionRepository extends BaseRepository implements InterventionRepositoryInterface
{
    public function __construct(Intervention $model)
    {
        parent::__construct($model);
    }
}
