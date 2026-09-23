<?php

namespace App\Repositories;

use App\Models\Bizbox\Discount;
use App\Repositories\Contracts\DiscountRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class DiscountRepository implements DiscountRepositoryInterface
{
    public function __construct(protected Discount $model) {}

    public function all(): Collection
    {
        return $this->model->newQuery()->orderBy('PK_mscDiscounts')->get();
    }
}
