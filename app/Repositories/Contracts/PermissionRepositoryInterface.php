<?php

namespace App\Repositories\Contracts;

use Illuminate\Database\Eloquent\Model;

interface PermissionRepositoryInterface extends RepositoryInterface
{
    public function findByName(string $name): ?Model;
}
