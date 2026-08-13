<?php

namespace App\Repositories;

use App\Models\HospitalPatient;
use App\Repositories\Contracts\HospitalPatientRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

class HospitalPatientRepository implements HospitalPatientRepositoryInterface
{
    public function __construct(protected HospitalPatient $model) {}

    public function get(?string $search = null, int $limit = 100): Collection
    {
        return $this->model->newQuery()
            ->when($search !== null && $search !== '', function ($query) use ($search) {
                $query->where('last_name', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%");
            })
            ->limit($limit)
            ->get();
    }

    public function find(int|string $id): ?Model
    {
        return $this->model->newQuery()->find($id);
    }
}
