<?php

namespace App\Http\Controllers;

use App\Http\Resources\PatientAssistanceResource;
use App\Models\PatientAssistance;
use App\Services\PatientAssistanceService;
use Illuminate\Http\Request;

class ReleaseAssistanceController extends Controller
{
    public function __invoke(Request $request, PatientAssistance $assistance, PatientAssistanceService $service): PatientAssistanceResource
    {
        return PatientAssistanceResource::make(
            $service->release($assistance, $request->user())->load(['assistantType', 'guarantor', 'reports']),
        );
    }
}
