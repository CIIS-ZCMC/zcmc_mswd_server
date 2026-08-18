<?php

namespace App\Http\Controllers;

use App\Http\Resources\PatientMergeResource;
use App\Models\Patient;
use App\Models\PatientMerge;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PatientMergesController extends Controller
{
    /**
     * The merge history for a patient (merges where it is the surviving target).
     */
    public function __invoke(Patient $patient): AnonymousResourceCollection
    {
        return PatientMergeResource::collection(
            PatientMerge::query()->where('target_patient_id', $patient->id)->latest()->get(),
        );
    }
}
