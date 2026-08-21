<?php

namespace App\Http\Controllers;

use App\Http\Resources\PatientAssistanceResource;
use App\Models\PatientAssistance;
use App\Services\PatientAssistanceService;
use Illuminate\Http\Request;

class CancelAssistanceController extends Controller
{
    public function __invoke(Request $request, PatientAssistance $assistance, PatientAssistanceService $service): PatientAssistanceResource
    {
        $validated = $request->validate(['notes' => ['nullable', 'string']]);

        return PatientAssistanceResource::make(
            $service->cancel($assistance, $request->user(), $validated['notes'] ?? null)
                ->load(['assistantType', 'guarantor']),
        );
    }
}
