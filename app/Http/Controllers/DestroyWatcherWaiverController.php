<?php

namespace App\Http\Controllers;

use App\Http\Resources\CaseModelResource;
use App\Models\CaseModel;
use App\Services\WatcherWaiverService;

class DestroyWatcherWaiverController extends Controller
{
    public function __invoke(CaseModel $case, WatcherWaiverService $service): CaseModelResource
    {
        return CaseModelResource::make($service->clear($case));
    }
}
