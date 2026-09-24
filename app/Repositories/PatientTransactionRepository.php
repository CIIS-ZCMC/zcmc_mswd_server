<?php

namespace App\Repositories;

use App\Models\Bizbox\PatientTransaction;
use App\Repositories\Contracts\PatientTransactionRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

class PatientTransactionRepository implements PatientTransactionRepositoryInterface
{
    public function __construct(protected PatientTransaction $model) {}

    public function paginate(?string $search = null, ?string $date = null, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->newQuery()
            ->with('patient.personalData')
            ->when(filled($search), fn ($query) => $query->where(fn ($group) => $group
                ->whereHas('patient', fn ($sub) => $sub->where('patid', 'like', "%{$search}%"))
                ->orWhereHas('patient.personalData', fn ($sub) => $sub
                    ->where('lastname', 'like', "%{$search}%")
                    ->orWhere('firstname', 'like', "%{$search}%"))))
            ->when(filled($date), fn ($query) => $query->whereDate('registrydate', $date))
            ->orderByDesc('PK_psPatRegisters')
            ->paginate($perPage);
    }

    /**
     * Guarantors and the lookup vocabularies are eager-loaded here and NOT in
     * paginate()/search(): a list row never shows them, and search() feeds a
     * typeahead where the extra SQL Server round-trips would be felt on every
     * keystroke.
     */
    public function find(int|string $id): ?Model
    {
        return $this->model->newQuery()
            ->with(['patient.personalData', 'guarantors.guarantor.personalData', ...PatientTransaction::LOOKUPS])
            ->find($id);
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

    /**
     * Every transaction belonging to one HIS patient, newest first.
     *
     * Takes the HIS surrogate key (emdPatients.PK_emdPatients), NOT the hospital
     * number (patid) a local patient row stores — see
     * PatientTransactionService::forHospitalNumber() for the bridge.
     *
     * Guarantors are loaded down to guarantor.personalData because that is where
     * a guarantor's name lives; stopping at `guarantors` yields rows that cannot
     * name themselves.
     *
     * Lookups load here too: this feeds the patient's transactions tab, which
     * shows per-encounter detail, and eager-loading costs one query per relation
     * regardless of how many transactions come back.
     */
    public function getByPatientId(int $patientId): Collection
    {
        return $this->model->newQuery()
            ->with(['patient.personalData', 'guarantors.guarantor.personalData', ...PatientTransaction::LOOKUPS])
            ->where('FK_emdPatients', $patientId)
            ->orderByDesc('PK_psPatRegisters')
            ->get();
    }
}
