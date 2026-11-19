<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Guarantee amounts released per day and guarantor, for the dashboard's
 * Assistance released card. `?from=&to=` (Y-m-d), the last 7 days by default.
 */
class GuaranteeTotalsController extends Controller implements HasMiddleware
{
    public function __construct(protected DashboardService $dashboard) {}

    public static function middleware(): array
    {
        return [new Middleware('permission:guarantee.view')];
    }

    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d'],
        ]);

        return response()->json([
            'data' => $this->dashboard->guaranteeTotals($validated['from'] ?? null, $validated['to'] ?? null, $request->user()),
        ]);
    }
}
