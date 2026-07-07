<?php

namespace App\Repositories;

use App\Models\PatientAssistance;
use App\Repositories\Contracts\PatientAssistanceRepositoryInterface;

class PatientAssistanceRepository extends BaseRepository implements PatientAssistanceRepositoryInterface
{
    public function __construct(PatientAssistance $model)
    {
        parent::__construct($model);
    }
}
