<?php

namespace App\Repositories;

use App\Models\Bizbox\HospitalPlan;
use App\Repositories\Contracts\HospitalPlanRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class HospitalPlanRepository implements HospitalPlanRepositoryInterface
{
    public function __construct(protected HospitalPlan $model) {}

    public function all(): Collection
    {
        return $this->model->newQuery()->orderBy('PK_mscHospPlan')->get();
    }
}
