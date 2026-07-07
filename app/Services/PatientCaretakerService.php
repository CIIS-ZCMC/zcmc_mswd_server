<?php

namespace App\Services;

use App\DTOs\PatientCaretakerDto;
use App\Models\PatientCaretaker;
use App\Repositories\Contracts\PatientCaretakerRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class PatientCaretakerService
{
    public function __construct(protected PatientCaretakerRepositoryInterface $repository)
    {
    }

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function find(int|string $id): PatientCaretaker
    {
        return $this->repository->findOrFail($id);
    }

    public function create(PatientCaretakerDto $dto): PatientCaretaker
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(PatientCaretaker $patientCaretaker, PatientCaretakerDto $dto): PatientCaretaker
    {
        return $this->repository->update($patientCaretaker, $dto->toArray());
    }

    public function delete(PatientCaretaker $patientCaretaker): bool
    {
        return $this->repository->delete($patientCaretaker);
    }
}
