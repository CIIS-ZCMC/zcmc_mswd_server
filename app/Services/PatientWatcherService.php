<?php

namespace App\Services;

use App\DTOs\PatientWatcherDto;
use App\Models\CaseModel;
use App\Models\PatientWatcher;
use App\Repositories\Contracts\PatientWatcherRepositoryInterface;
use Illuminate\Validation\ValidationException;

class PatientWatcherService
{
    public function __construct(protected PatientWatcherRepositoryInterface $repository) {}

    public function find(int|string $id): PatientWatcher
    {
        return $this->repository->findOrFail($id);
    }

    public function create(PatientWatcherDto $dto): PatientWatcher
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(PatientWatcher $patientWatcher, PatientWatcherDto $dto): PatientWatcher
    {
        return $this->repository->update($patientWatcher, $dto->toArray());
    }

    /**
     * A watcher still assigned to an open or ongoing case cannot be removed:
     * the case may be relying on them as its primary watcher or pass holder.
     * Assignments on closed cases stay as history (they read the trashed row).
     */
    public function delete(PatientWatcher $patientWatcher): bool
    {
        $assignedToOpenCase = $patientWatcher->caseWatchers()
            ->whereHas('case', fn ($case) => $case->whereIn('status', [CaseModel::STATUS_OPEN, CaseModel::STATUS_ONGOING]))
            ->exists();

        if ($assignedToOpenCase) {
            throw ValidationException::withMessages([
                'watcher' => 'This watcher is assigned to an open case. Unassign them from it before removing.',
            ]);
        }

        return $this->repository->delete($patientWatcher);
    }
}
