<?php

namespace App\Services;

use App\DTOs\InterventionTypeDto;
use App\Models\InterventionType;
use App\Repositories\Contracts\InterventionTypeRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class InterventionTypeService
{
    public function __construct(protected InterventionTypeRepositoryInterface $repository)
    {
    }

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function find(int|string $id): InterventionType
    {
        return $this->repository->findOrFail($id);
    }

    public function create(InterventionTypeDto $dto): InterventionType
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(InterventionType $interventionType, InterventionTypeDto $dto): InterventionType
    {
        return $this->repository->update($interventionType, $dto->toArray());
    }

    public function delete(InterventionType $interventionType): bool
    {
        return $this->repository->delete($interventionType);
    }
}
