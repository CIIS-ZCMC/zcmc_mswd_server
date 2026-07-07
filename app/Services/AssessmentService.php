<?php

namespace App\Services;

use App\DTOs\AssessmentDto;
use App\Models\Assessment;
use App\Repositories\Contracts\AssessmentRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AssessmentService
{
    public function __construct(protected AssessmentRepositoryInterface $repository)
    {
    }

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function find(int|string $id): Assessment
    {
        return $this->repository->findOrFail($id);
    }

    public function create(AssessmentDto $dto): Assessment
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(Assessment $assessment, AssessmentDto $dto): Assessment
    {
        return $this->repository->update($assessment, $dto->toArray());
    }

    public function delete(Assessment $assessment): bool
    {
        return $this->repository->delete($assessment);
    }
}
