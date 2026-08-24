<?php

namespace App\Services;

use App\DTOs\UserDto;
use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Support\ListQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class UserService
{
    public function __construct(protected UserRepositoryInterface $repository) {}

    public function list(?ListQuery $query = null): LengthAwarePaginator
    {
        return $this->repository->paginateList($query ?? new ListQuery);
    }

    public function find(int|string $id): User
    {
        return $this->repository->findOrFail($id);
    }

    public function create(UserDto $dto): User
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(User $user, UserDto $dto): User
    {
        return $this->repository->update($user, $dto->toArray());
    }

    public function delete(User $user): bool
    {
        return $this->repository->delete($user);
    }
}
