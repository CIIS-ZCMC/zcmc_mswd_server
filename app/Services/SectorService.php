<?php

namespace App\Services;

use App\DTOs\SectorDto;
use App\Models\Sector;
use App\Repositories\Contracts\SectorRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class SectorService
{
    public function __construct(protected SectorRepositoryInterface $repository)
    {
    }

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function find(int|string $id): Sector
    {
        return $this->repository->findOrFail($id);
    }

    public function create(SectorDto $dto): Sector
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(Sector $sector, SectorDto $dto): Sector
    {
        return $this->repository->update($sector, $dto->toArray());
    }

    public function delete(Sector $sector): bool
    {
        return $this->repository->delete($sector);
    }
}
