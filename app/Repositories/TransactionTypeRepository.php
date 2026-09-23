<?php

namespace App\Repositories;

use App\Models\Bizbox\TransactionType;
use App\Repositories\Contracts\TransactionTypeRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class TransactionTypeRepository implements TransactionTypeRepositoryInterface
{
    public function __construct(protected TransactionType $model) {}

    public function all(): Collection
    {
        return $this->model->newQuery()->orderBy('PK_mscHospTranTypes')->get();
    }
}
