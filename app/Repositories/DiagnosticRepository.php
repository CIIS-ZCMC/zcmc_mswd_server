<?php

namespace App\Repositories;

use App\Models\Diagnostic;
use App\Repositories\Contracts\DiagnosticRepositoryInterface;

class DiagnosticRepository extends BaseRepository implements DiagnosticRepositoryInterface
{
    public function __construct(Diagnostic $model)
    {
        parent::__construct($model);
    }
}
