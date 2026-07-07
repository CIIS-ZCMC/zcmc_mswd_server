<?php

namespace App\Services;

use App\DTOs\CaseActivityDto;
use App\Models\CaseActivity;
use App\Repositories\Contracts\CaseActivityRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class CaseActivityService
{
    public function __construct(protected CaseActivityRepositoryInterface $repository)
    {
    }

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function find(int|string $id): CaseActivity
    {
        return $this->repository->findOrFail($id);
    }

    public function create(CaseActivityDto $dto): CaseActivity
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(CaseActivity $caseActivity, CaseActivityDto $dto): CaseActivity
    {
        return $this->repository->update($caseActivity, $dto->toArray());
    }

    public function delete(CaseActivity $caseActivity): bool
    {
        return $this->repository->delete($caseActivity);
    }
}
