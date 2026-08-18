<?php

namespace App\Repositories;

use App\Models\Bizbox\HospitalPatient;
use App\Repositories\Contracts\HospitalPatientRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

class HospitalPatientRepository implements HospitalPatientRepositoryInterface
{
    public function __construct(protected HospitalPatient $model) {}

    public function paginate(?string $search = null, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->newQuery()
            ->when(filled($search), fn ($query) => $query->whereHas('personalData', function ($sub) use ($search) {
                $sub->where('lastname', 'like', "%{$search}%")
                    ->orWhere('firstname', 'like', "%{$search}%");
            }))
            ->orderBy('last_name')
            ->paginate($perPage);
    }

    public function find(int|string $id): ?Model
    {
        return $this->model->newQuery()->with('personalData')->find($id);
    }

    /**
     * One-box lookup: match a single term against the hospital number OR any
     * part of the name. Used by the intake sheet's HIS patient picker.
     */
    public function search(string $term, int $limit = 20): Collection
    {
        return $this->model->newQuery()
            ->with('personalData')
            ->where(fn ($query) => $query
                ->where('patid', 'like', "%{$term}%")
                ->orWhereHas('personalData', fn ($sub) => $sub
                    ->where('lastname', 'like', "%{$term}%")
                    ->orWhere('firstname', 'like', "%{$term}%")
                    ->orWhere('middlename', 'like', "%{$term}%")))
            ->orderByDesc('PK_emdPatients')
            ->limit($limit)
            ->get();
    }

    public function findByNameAndHospitalNumber(?string $name = null, int|string|null $hospitalNumber = null): Collection
    {
        return $this->model->newQuery()
            ->with(['personalData'])
            ->when(filled($hospitalNumber), fn ($query) => $query->where('patid', $hospitalNumber))
            ->when(filled($name), fn ($query) => $query->whereHas('personalData', function ($sub) use ($name) {
                $sub->where('lastname', 'like', "%{$name}%")
                    ->orWhere('firstname', 'like', "%{$name}%");
            }))
            ->get();
    }
}
