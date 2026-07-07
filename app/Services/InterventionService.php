<?php

namespace App\Services;

use App\DTOs\InterventionDto;
use App\Models\Intervention;
use App\Repositories\Contracts\InterventionRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class InterventionService
{
    public function __construct(protected InterventionRepositoryInterface $repository)
    {
    }

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function find(int|string $id): Intervention
    {
        return $this->repository->findOrFail($id);
    }

    public function create(InterventionDto $dto): Intervention
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(Intervention $intervention, InterventionDto $dto): Intervention
    {
        return $this->repository->update($intervention, $dto->toArray());
    }

    public function delete(Intervention $intervention): bool
    {
        return $this->repository->delete($intervention);
    }
}
