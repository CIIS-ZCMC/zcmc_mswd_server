<?php

namespace App\Repositories;

use App\Models\Permission;
use App\Repositories\Contracts\PermissionRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

class PermissionRepository extends BaseRepository implements PermissionRepositoryInterface
{
    /** @var list<string> */
    protected array $searchable = ['name'];

    /** @var list<string> */
    protected array $filterable = ['guard_name'];

    /** @var list<string> */
    protected array $sortable = ['name', 'created_at'];

    protected string $defaultSort = 'name';

    /** @var list<string> */
    protected array $listWithCount = ['roles'];

    public function __construct(Permission $model)
    {
        parent::__construct($model);
    }

    public function all(): Collection
    {
        return $this->model->newQuery()->orderBy('name')->get();
    }

    public function findByName(string $name): ?Model
    {
        return $this->model->newQuery()->where('name', $name)->first();
    }
}
