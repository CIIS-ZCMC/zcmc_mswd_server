<?php

namespace App\Http\Controllers;

use App\Http\Resources\CaseWatcherResource;
use App\Models\CaseWatcher;
use App\Services\CaseWatcherService;

class PromoteCaseWatcherController extends Controller
{
    public function __invoke(CaseWatcher $caseWatcher, CaseWatcherService $service): CaseWatcherResource
    {
        return CaseWatcherResource::make($service->promote($caseWatcher));
    }
}
