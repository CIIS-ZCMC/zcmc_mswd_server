<?php

namespace App\Repositories;

use App\Models\Bizbox\Membership;
use App\Repositories\Contracts\MembershipRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class MembershipRepository implements MembershipRepositoryInterface
{
    public function __construct(protected Membership $model) {}

    public function all(): Collection
    {
        return $this->model->newQuery()->orderBy('PK_mscPHICMemberships')->get();
    }
}
