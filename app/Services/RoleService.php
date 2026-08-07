<?php

namespace App\Services;

use App\DTOs\RoleDto;
use App\Models\Role;
use App\Repositories\Contracts\RoleRepositoryInterface;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class RoleService
{
    public function __construct(protected RoleRepositoryInterface $repository) {}

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function find(int|string $id): Role
    {
        return $this->repository->findOrFail($id);
    }

    public function create(RoleDto $dto): Role
    {
        $attributes = $dto->toArray();
        $attributes['guard_name'] ??= RolesAndPermissionsSeeder::GUARD;

        /** @var Role $role */
        $role = $this->repository->create($attributes);

        if ($dto->permissions !== null) {
            $this->repository->syncPermissions($role, $dto->permissions);
        }

        return $role->load('permissions');
    }

    public function update(Role $role, RoleDto $dto): Role
    {
        if ($this->isSuperAdmin($role) && $dto->name !== null && $dto->name !== $role->name) {
            throw new AuthorizationException('The super administrator role cannot be renamed.');
        }

        /** @var Role $role */
        $role = $this->repository->update($role, $dto->toArray());

        if ($dto->permissions !== null) {
            $this->repository->syncPermissions($role, $dto->permissions);
        }

        return $role->load('permissions');
    }

    public function delete(Role $role): bool
    {
        if ($this->isCore($role)) {
            throw new AuthorizationException('Core roles cannot be deleted.');
        }

        return $this->repository->delete($role);
    }

    /**
     * Core roles are defined in code (the seeder) and back the app's defaults.
     */
    public function isCore(Role $role): bool
    {
        return array_key_exists($role->name, RolesAndPermissionsSeeder::ROLES);
    }

    public function isSuperAdmin(Role $role): bool
    {
        return $role->name === RolesAndPermissionsSeeder::SUPER_ADMIN;
    }
}
