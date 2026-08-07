<?php

namespace App\Services;

use App\DTOs\PermissionDto;
use App\Models\Permission;
use App\Repositories\Contracts\PermissionRepositoryInterface;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class PermissionService
{
    public function __construct(protected PermissionRepositoryInterface $repository) {}

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function find(int|string $id): Permission
    {
        return $this->repository->findOrFail($id);
    }

    public function create(PermissionDto $dto): Permission
    {
        $attributes = $dto->toArray();
        $attributes['guard_name'] ??= RolesAndPermissionsSeeder::GUARD;

        return $this->repository->create($attributes);
    }

    public function update(Permission $permission, PermissionDto $dto): Permission
    {
        $this->guardCore($permission);

        return $this->repository->update($permission, $dto->toArray());
    }

    public function delete(Permission $permission): bool
    {
        $this->guardCore($permission);

        return $this->repository->delete($permission);
    }

    /**
     * Core permissions come from the seeder catalog and back the API
     * `permission:` middleware — they must not be renamed or deleted.
     */
    public function isCore(Permission $permission): bool
    {
        return in_array($permission->name, RolesAndPermissionsSeeder::PERMISSIONS, true);
    }

    protected function guardCore(Permission $permission): void
    {
        if ($this->isCore($permission)) {
            throw new AuthorizationException('Core permissions cannot be modified or deleted.');
        }
    }
}
