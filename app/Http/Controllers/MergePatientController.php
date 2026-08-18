<?php

namespace App\Http\Controllers;

use App\Http\Requests\MergePatientRequest;
use App\Http\Resources\PatientResource;
use App\Models\Patient;
use App\Services\PatientMergeService;

class MergePatientController extends Controller
{
    /**
     * Merge this patient (source) into another (target), reassigning records.
     */
    public function __invoke(MergePatientRequest $request, Patient $patient, PatientMergeService $merge): PatientResource
    {
        $target = Patient::findOrFail($request->validated('target_id'));

        return PatientResource::make($merge->merge($patient, $target));
    }
}
