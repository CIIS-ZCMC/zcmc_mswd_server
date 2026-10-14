<?php

namespace App\Http\Controllers;

use App\Services\TurnaroundReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** The turnaround time dashboard (`reports.view`, set on the route). */
class TurnaroundReportController extends Controller
{
    public function __invoke(Request $request, TurnaroundReportService $service): JsonResponse
    {
        $validated = $request->validate([
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d'],
        ]);

        return response()->json([
            'data' => $service->summary($request->user(), $validated['from'] ?? null, $validated['to'] ?? null),
        ]);
    }
}
