<?php

namespace App\Http\Controllers;

use App\Models\CaseModel;
use App\Services\WatcherRequirementService;
use Illuminate\Http\JsonResponse;

/**
 * Same watcher_status shape as GET /cases/{case}/profile — a lighter-weight
 * fetch for the client banner when the full profile isn't needed.
 */
class CaseWatcherStatusController extends Controller
{
    public function __invoke(CaseModel $case, WatcherRequirementService $service): JsonResponse
    {
        return response()->json(['data' => $service->status($case)]);
    }
}
