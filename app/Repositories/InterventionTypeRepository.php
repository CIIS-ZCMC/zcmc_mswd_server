<?php

namespace App\Repositories;

use App\Models\InterventionType;
use App\Repositories\Contracts\InterventionTypeRepositoryInterface;

class InterventionTypeRepository extends BaseRepository implements InterventionTypeRepositoryInterface
{
    public function __construct(InterventionType $model)
    {
        parent::__construct($model);
    }
}
