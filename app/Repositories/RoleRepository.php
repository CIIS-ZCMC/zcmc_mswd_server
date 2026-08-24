<?php

namespace App\Repositories;

use App\Models\Role;
use App\Repositories\Contracts\RoleRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

class RoleRepository extends BaseRepository implements RoleRepositoryInterface
{
    /** @var list<string> */
    protected array $searchable = ['name', 'description'];

    /** @var list<string> */
    protected array $filterable = ['guard_name'];

    /** @var list<string> */
    protected array $sortable = ['name', 'created_at'];

    protected string $defaultSort = 'name';

    /** @var list<string> */
    protected array $listWithCount = ['permissions'];

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
