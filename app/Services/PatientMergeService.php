<?php

namespace App\Services;

use App\Models\Patient;
use App\Models\UnifiedIntakeSheet;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PatientMergeService
{
    /**
     * Merge a duplicate patient (source) into a surviving one (target):
     * reassign every owned record, archive the source, and log the merge.
     */
    public function merge(Patient $source, Patient $target): Patient
    {
        if ($source->is($target)) {
            throw ValidationException::withMessages([
                'target_id' => 'A patient cannot be merged into itself.',
            ]);
        }

        return DB::transaction(function () use ($source, $target) {
            $source->cases()->update(['patient_id' => $target->id]);
            $source->patientIds()->update(['patient_id' => $target->id]);
            $source->familyMembers()->update(['patient_id' => $target->id]);
            $source->watchers()->update(['patient_id' => $target->id]);
            $source->caretakers()->update(['patient_id' => $target->id]);
            $source->documents()->update(['patient_id' => $target->id]);

            UnifiedIntakeSheet::where('patient_id', $source->id)
                ->update(['patient_id' => $target->id]);

            $source->delete();

            activity()
                ->performedOn($target)
                ->withProperties(['merged_patient_id' => $source->id])
                ->log('patient_merged');

            return $target->fresh();
        });
    }
}
