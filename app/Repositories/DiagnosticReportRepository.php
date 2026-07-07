<?php

namespace App\Repositories;

use App\Models\DiagnosticReport;
use App\Repositories\Contracts\DiagnosticReportRepositoryInterface;

class DiagnosticReportRepository extends BaseRepository implements DiagnosticReportRepositoryInterface
{
    public function __construct(DiagnosticReport $model)
    {
        parent::__construct($model);
    }
}
