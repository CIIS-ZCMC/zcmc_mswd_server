<?php

namespace App\Repositories;

use App\Models\HospitalPatient;
use App\Repositories\Contracts\HospitalPatientRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;

class HospitalPatientRepository implements HospitalPatientRepositoryInterface
{
    public function __construct(protected HospitalPatient $model) {}

    public function paginate(?string $search = null, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->newQuery()
            ->when(filled($search), fn ($query) => $query->where(function ($sub) use ($search) {
                $sub->where('last_name', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%");
            }))
            ->orderBy('last_name')
            ->paginate($perPage);
    }

    public function find(int|string $id): ?Model
    {
        return $this->model->newQuery()->find($id);
    }

    public function findByNameAndHospitalNumber(?string $name = null, int|string|null $hospitalNumber = null): ?Model
    {
        return $this->model->newQuery()
            ->when(filled($hospitalNumber), fn ($query) => $query->where('hospital_number', $hospitalNumber))
            ->when(filled($name), fn ($query) => $query->where(function ($sub) use ($name) {
                $sub->where('last_name', 'like', "%{$name}%")
                    ->orWhere('first_name', 'like', "%{$name}%");
            }))
            ->first();
    }
}
