<?php

namespace App\Repositories;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;

class UserRepository extends BaseRepository implements UserRepositoryInterface
{
    /** @var list<string> */
    protected array $searchable = ['employee_name', 'employee_number', 'email'];

    /** @var list<string> */
    protected array $filterable = ['is_active', 'role'];

    /** @var list<string> */
    protected array $sortable = ['employee_name', 'employee_number', 'is_active', 'synced_at'];

    protected string $defaultSort = 'employee_name';

    /** @var list<string> */
    protected array $listWith = ['roles'];

    public function __construct(User $model)
    {
        parent::__construct($model);
    }
}
