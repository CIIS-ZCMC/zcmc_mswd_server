<?php

namespace App\Services;

use App\DTOs\CaseModelDto;
use App\Models\CaseModel;
use App\Repositories\Contracts\CaseModelRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class CaseModelService
{
    public function __construct(protected CaseModelRepositoryInterface $repository)
    {
    }

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function find(int|string $id): CaseModel
    {
        return $this->repository->findOrFail($id);
    }

    public function create(CaseModelDto $dto): CaseModel
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(CaseModel $caseModel, CaseModelDto $dto): CaseModel
    {
        return $this->repository->update($caseModel, $dto->toArray());
    }

    public function delete(CaseModel $caseModel): bool
    {
        return $this->repository->delete($caseModel);
    }
}
