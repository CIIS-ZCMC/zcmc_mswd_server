<?php

namespace App\Repositories;

use App\Models\Bizbox\ServiceType;
use App\Repositories\Contracts\ServiceTypeRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class ServiceTypeRepository implements ServiceTypeRepositoryInterface
{
    public function __construct(protected ServiceType $model) {}

    public function all(): Collection
    {
        return $this->model->newQuery()->orderBy('PK_mscServiceType')->get();
    }
}
