<?php

namespace App\Http\Controllers;

use App\Http\Resources\UisPrintLogResource;
use App\Models\CaseModel;
use App\Services\UisPrintLogService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * The Unified Intake Sheet print history for a case (and thus its encounter),
 * newest first.
 */
class CaseUisPrintHistoryController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:intake.view')];
    }

    public function __invoke(CaseModel $case, UisPrintLogService $service): AnonymousResourceCollection
    {
        return UisPrintLogResource::collection($service->history($case));
    }
}
