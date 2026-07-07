<?php

namespace App\Repositories;

use App\Models\PatientCaretaker;
use App\Repositories\Contracts\PatientCaretakerRepositoryInterface;

class PatientCaretakerRepository extends BaseRepository implements PatientCaretakerRepositoryInterface
{
    public function __construct(PatientCaretaker $model)
    {
        parent::__construct($model);
    }
}
