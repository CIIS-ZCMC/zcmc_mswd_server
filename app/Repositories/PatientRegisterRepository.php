<?php

namespace App\Repositories;

use App\Models\Bizbox\PatientRegister;
use App\Repositories\Contracts\PatientRegisterRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

class PatientRegisterRepository implements PatientRegisterRepositoryInterface
{
    public function __construct(protected PatientRegister $model) {}

    public function paginate(?string $search = null, ?string $date = null, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->newQuery()
            ->with('patient.personalData')
            ->when(filled($search), fn ($query) => $query->whereHas('patient.personalData', function ($sub) use ($search) {
                $sub->where('lastname', 'like', "%{$search}%")
                    ->orWhere('firstname', 'like', "%{$search}%");
            }))
            ->when(filled($date), fn ($query) => $query->whereDate('registrydate', $date))
            ->orderByDesc('PK_psPatRegisters')
            ->paginate($perPage);
    }

    public function find(int|string $id): ?Model
    {
        return $this->model->newQuery()->with('patient.personalData')->find($id);
    }

    public function search(string $term, ?string $date = null, int $limit = 20): Collection
    {
        return $this->model->newQuery()
            ->with('patient.personalData')
            ->where(fn ($query) => $query
                ->whereHas('patient', fn ($sub) => $sub->where('patid', 'like', "%{$term}%"))
                ->orWhereHas('patient.personalData', fn ($sub) => $sub
                    ->where('lastname', 'like', "%{$term}%")
                    ->orWhere('firstname', 'like', "%{$term}%")
                    ->orWhere('middlename', 'like', "%{$term}%")))
            ->when(filled($date), fn ($query) => $query->whereDate('registrydate', $date))
            ->orderByDesc('PK_psPatRegisters')
            ->limit($limit)
            ->get();
    }

    public function findByNameAndHospitalNumber(?string $name = null, int|string|null $hospitalNumber = null, ?string $date = null): Collection
    {
        return $this->model->newQuery()
            ->with(['patient', 'patient.personalData'])
            ->when(filled($hospitalNumber), fn ($query) => $query->whereHas('patient', function ($sub) use ($hospitalNumber) {
                $sub->where('patid', $hospitalNumber);
            }))
            ->when(filled($name), fn ($query) => $query->whereHas('patient.personalData', function ($sub) use ($name) {
                $sub->where('lastname', 'like', "%{$name}%")
                    ->orWhere('firstname', 'like', "%{$name}%");
            }))
            ->when(filled($date), fn ($query) => $query->whereDate('registrydate', $date))
            ->get();
    }
}
