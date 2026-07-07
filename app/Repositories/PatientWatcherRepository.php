<?php

namespace App\Repositories;

use App\Models\PatientWatcher;
use App\Repositories\Contracts\PatientWatcherRepositoryInterface;

class PatientWatcherRepository extends BaseRepository implements PatientWatcherRepositoryInterface
{
    public function __construct(PatientWatcher $model)
    {
        parent::__construct($model);
    }
}
