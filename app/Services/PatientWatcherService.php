<?php

namespace App\Services;

use App\DTOs\PatientWatcherDto;
use App\Models\PatientWatcher;
use App\Repositories\Contracts\PatientWatcherRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class PatientWatcherService
{
    public function __construct(protected PatientWatcherRepositoryInterface $repository)
    {
    }

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

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

    public function delete(PatientWatcher $patientWatcher): bool
    {
        return $this->repository->delete($patientWatcher);
    }
}
