<?php

namespace App\Repositories;

use App\Models\Bizbox\HospitalCaseType;
use App\Repositories\Contracts\HospitalCaseTypeRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class HospitalCaseTypeRepository implements HospitalCaseTypeRepositoryInterface
{
    public function __construct(protected HospitalCaseType $model) {}

    public function all(): Collection
    {
        return $this->model->newQuery()->orderBy('PK_mscHospCaseTypes')->get();
    }
}
