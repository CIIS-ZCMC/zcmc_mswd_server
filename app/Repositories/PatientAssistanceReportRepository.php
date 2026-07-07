<?php

namespace App\Repositories;

use App\Models\PatientAssistanceReport;
use App\Repositories\Contracts\PatientAssistanceReportRepositoryInterface;

class PatientAssistanceReportRepository extends BaseRepository implements PatientAssistanceReportRepositoryInterface
{
    public function __construct(PatientAssistanceReport $model)
    {
        parent::__construct($model);
    }
}
