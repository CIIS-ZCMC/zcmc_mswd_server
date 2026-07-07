<?php

namespace App\Repositories;

use App\Models\PatientAssistanceLog;
use App\Repositories\Contracts\PatientAssistanceLogRepositoryInterface;

class PatientAssistanceLogRepository extends BaseRepository implements PatientAssistanceLogRepositoryInterface
{
    public function __construct(PatientAssistanceLog $model)
    {
        parent::__construct($model);
    }
}
