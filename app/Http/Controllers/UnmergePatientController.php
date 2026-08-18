<?php

namespace App\Http\Controllers;

use App\Http\Resources\PatientResource;
use App\Models\Patient;
use App\Services\PatientMergeService;
use Illuminate\Validation\ValidationException;

class UnmergePatientController extends Controller
{
    /**
     * Reverse the most recent un-reversed merge into this patient: records move
     * back to the duplicate and it is restored.
     */
    public function __invoke(Patient $patient, PatientMergeService $merge): PatientResource
    {
        $record = $merge->latestActiveMergeInto($patient);

        if ($record === null) {
            throw ValidationException::withMessages([
                'patient' => 'This patient has no merge to reverse.',
            ]);
        }

        return PatientResource::make($merge->reverse($record));
    }
}
