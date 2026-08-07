<?php

namespace App\Repositories;

use App\Models\Role;
use App\Repositories\Contracts\RoleRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

class RoleRepository extends BaseRepository implements RoleRepositoryInterface
{
    public function __construct(Role $model)
    {
        parent::__construct($model);
    }

    public function all(): Collection
    {
        return $this->model->newQuery()->with('permissions')->orderBy('name')->get();
    }

    public function findByName(string $name): ?Model
    {
        return $this->model->newQuery()->where('name', $name)->first();
    }

    public function syncPermissions(Model $role, array $permissions): Model
    {
        /** @var Role $role */
        $role->syncPermissions($permissions);

        return $role->load('permissions');
    }
}
