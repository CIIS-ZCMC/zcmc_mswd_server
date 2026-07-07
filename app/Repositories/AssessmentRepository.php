<?php

namespace App\Repositories;

use App\Models\Assessment;
use App\Repositories\Contracts\AssessmentRepositoryInterface;

class AssessmentRepository extends BaseRepository implements AssessmentRepositoryInterface
{
    public function __construct(Assessment $model)
    {
        parent::__construct($model);
    }
}
