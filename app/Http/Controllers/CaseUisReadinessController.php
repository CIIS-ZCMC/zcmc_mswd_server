<?php

namespace App\Http\Controllers;

use App\Models\CaseModel;
use App\Services\UisReadinessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Whether a case's Unified Intake Sheet is ready to print: its intake
 * assessment, the sections still missing, the classification and print count.
 */
class CaseUisReadinessController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:intake.view')];
    }

    public function __invoke(CaseModel $case, UisReadinessService $service): JsonResponse
    {
        return response()->json(['data' => $service->summary($case)]);
    }
}
