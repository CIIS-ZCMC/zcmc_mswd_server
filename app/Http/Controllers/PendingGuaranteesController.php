<?php

namespace App\Http\Controllers;

use App\Http\Resources\PendingGuaranteeResource;
use App\Services\PatientGuaranteeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Guarantees waiting for a guarantee.approve holder's sign-off, oldest first. Feeds
 * the Approvals screen and the badge on the nav rail.
 */
class PendingGuaranteesController extends Controller implements HasMiddleware
{
    public function __construct(protected PatientGuaranteeService $service) {}

    public static function middleware(): array
    {
        return [new Middleware('permission:guarantee.approve')];
    }

    public function __invoke(): JsonResponse
    {
        $pending = $this->service->pendingApproval();

        return response()->json([
            'data' => PendingGuaranteeResource::collection($pending)->resolve(),
            'count' => $pending->count(),
            'threshold' => (float) config('mss.guarantee_approval_threshold'),
        ]);
    }
}
