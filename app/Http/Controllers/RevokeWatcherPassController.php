<?php

namespace App\Http\Controllers;

use App\Http\Resources\CaseWatcherResource;
use App\Models\CaseWatcher;
use App\Services\CaseWatcherService;

class RevokeWatcherPassController extends Controller
{
    public function __invoke(CaseWatcher $caseWatcher, CaseWatcherService $service): CaseWatcherResource
    {
        return CaseWatcherResource::make($service->revokePass($caseWatcher));
    }
}
