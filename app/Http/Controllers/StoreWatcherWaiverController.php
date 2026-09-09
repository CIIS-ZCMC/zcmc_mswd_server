<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreWatcherWaiverRequest;
use App\Http\Resources\CaseModelResource;
use App\Models\CaseModel;
use App\Services\WatcherWaiverService;

class StoreWatcherWaiverController extends Controller
{
    public function __invoke(StoreWatcherWaiverRequest $request, CaseModel $case, WatcherWaiverService $service): CaseModelResource
    {
        $validated = $request->validated();

        return CaseModelResource::make($service->file(
            $case,
            $validated['watcher_waiver_reason'],
            $validated['watcher_waiver_note'] ?? null,
            $request->user(),
        ));
    }
}
