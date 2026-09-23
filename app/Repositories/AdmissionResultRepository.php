<?php

namespace App\Repositories;

use App\Models\Bizbox\AdmissionResult;
use App\Repositories\Contracts\AdmissionResultRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class AdmissionResultRepository implements AdmissionResultRepositoryInterface
{
    public function __construct(protected AdmissionResult $model) {}

    public function all(): Collection
    {
        return $this->model->newQuery()->orderBy('PK_mscAdmResults')->get();
    }
}
