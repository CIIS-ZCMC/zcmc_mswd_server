<?php

namespace App\Repositories;

use App\Models\PatientId;
use App\Repositories\Contracts\PatientIdRepositoryInterface;

class PatientIdRepository extends BaseRepository implements PatientIdRepositoryInterface
{
    public function __construct(PatientId $model)
    {
        parent::__construct($model);
    }
}
