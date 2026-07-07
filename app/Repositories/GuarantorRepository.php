<?php

namespace App\Repositories;

use App\Models\Guarantor;
use App\Repositories\Contracts\GuarantorRepositoryInterface;

class GuarantorRepository extends BaseRepository implements GuarantorRepositoryInterface
{
    public function __construct(Guarantor $model)
    {
        parent::__construct($model);
    }
}
