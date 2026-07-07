<?php

namespace App\Repositories;

use App\Models\AssistantType;
use App\Repositories\Contracts\AssistantTypeRepositoryInterface;

class AssistantTypeRepository extends BaseRepository implements AssistantTypeRepositoryInterface
{
    public function __construct(AssistantType $model)
    {
        parent::__construct($model);
    }
}
