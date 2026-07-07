<?php

namespace App\Services;

use App\DTOs\AssistantTypeDto;
use App\Models\AssistantType;
use App\Repositories\Contracts\AssistantTypeRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AssistantTypeService
{
    public function __construct(protected AssistantTypeRepositoryInterface $repository)
    {
    }

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function find(int|string $id): AssistantType
    {
        return $this->repository->findOrFail($id);
    }

    public function create(AssistantTypeDto $dto): AssistantType
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(AssistantType $assistantType, AssistantTypeDto $dto): AssistantType
    {
        return $this->repository->update($assistantType, $dto->toArray());
    }

    public function delete(AssistantType $assistantType): bool
    {
        return $this->repository->delete($assistantType);
    }
}
