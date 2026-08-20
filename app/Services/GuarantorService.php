<?php

namespace App\Services;

use App\DTOs\GuarantorDto;
use App\Models\Guarantor;
use App\Repositories\Contracts\GuarantorRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class GuarantorService
{
    public function __construct(protected GuarantorRepositoryInterface $repository) {}

    public function list(int $page = 1, int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($page, $perPage);
    }

    public function find(int|string $id): Guarantor
    {
        return $this->repository->findOrFail($id);
    }

    public function create(GuarantorDto $dto): Guarantor
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(Guarantor $guarantor, GuarantorDto $dto): Guarantor
    {
        return $this->repository->update($guarantor, $dto->toArray());
    }

    public function delete(Guarantor $guarantor): bool
    {
        return $this->repository->delete($guarantor);
    }
}
