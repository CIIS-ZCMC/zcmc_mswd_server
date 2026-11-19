<?php

namespace App\Http\Controllers;

use App\Http\Resources\PatientGuaranteeResource;
use App\Models\PatientGuarantee;
use App\Services\PatientGuaranteeService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Signs off a guarantee at or above the approval threshold
 * (config `mss.guarantee_approval_threshold`). 422 unless it is waiting for approval.
 */
class ApproveGuaranteeController extends Controller implements HasMiddleware
{
    public function __construct(protected PatientGuaranteeService $service) {}

    public static function middleware(): array
    {
        return [new Middleware('permission:guarantee.approve')];
    }

    public function __invoke(Request $request, PatientGuarantee $guarantee): PatientGuaranteeResource
    {
        return PatientGuaranteeResource::make($this->service->approve($guarantee, $request->user()));
    }
}
