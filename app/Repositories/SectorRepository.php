<?php

namespace App\Repositories;

use App\Models\Sector;
use App\Repositories\Contracts\SectorRepositoryInterface;

class SectorRepository extends BaseRepository implements SectorRepositoryInterface
{
    public function __construct(Sector $model)
    {
        parent::__construct($model);
    }
}
