<?php

namespace App\Repositories;

use App\Models\Bizbox\PatientGuarantors;
use App\Repositories\Contracts\PatientGuarantorRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

class PatientGuarantorRepository implements PatientGuarantorRepositoryInterface
{
    public function __construct(protected PatientGuarantors $model) {}

    public function forRegistration(int|string $registrationId): Collection
    {
        return $this->model->newQuery()
            ->with('account.personalData')
            ->where('FK_psPatRegisters', $registrationId)
            ->orderBy('PK_TRXNO')
            ->get();
    }

    public function find(int|string $id): ?Model
    {
        return $this->model->newQuery()->with('account.personalData')->find($id);
    }
}
