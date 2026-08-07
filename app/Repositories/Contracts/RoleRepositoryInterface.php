<?php

namespace App\Repositories\Contracts;

use Illuminate\Database\Eloquent\Model;

interface RoleRepositoryInterface extends RepositoryInterface
{
    public function findByName(string $name): ?Model;

    /**
     * Replace the role's permissions with the given set.
     *
     * @param  array<int, string>  $permissions
     */
    public function syncPermissions(Model $role, array $permissions): Model;
}
