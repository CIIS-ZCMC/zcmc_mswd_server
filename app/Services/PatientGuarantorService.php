<?php

namespace App\Services;

use App\Models\Bizbox\PatientGuarantors;
use App\Repositories\Contracts\PatientGuarantorRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class PatientGuarantorService
{
    public function __construct(protected PatientGuarantorRepositoryInterface $repository) {}

    /**
     * Guarantors recorded against one HIS registration. Returns an empty
     * collection rather than throwing — an admission with no guarantor is
     * ordinary, not a missing record.
     */
    public function forRegistration(int|string $registrationId): Collection
    {
        return $this->repository->forRegistration($registrationId);
    }

    public function find(int|string $id): PatientGuarantors
    {
        return $this->repository->find($id)
            ?? throw (new ModelNotFoundException)->setModel(PatientGuarantors::class, [$id]);
    }
}
