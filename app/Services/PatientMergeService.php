<?php

namespace App\Services;

use App\Models\CaseModel;
use App\Models\Document;
use App\Models\Patient;
use App\Models\PatientCaretaker;
use App\Models\PatientFamilyMember;
use App\Models\PatientId;
use App\Models\PatientMerge;
use App\Models\PatientWatcher;
use App\Models\UnifiedIntakeSheet;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PatientMergeService
{
    /**
     * Records a patient owns, keyed for the merge manifest. Every one of these
     * is reassigned by its `patient_id`.
     *
     * @var array<string, class-string>
     */
    private const REASSIGNABLE = [
        'cases' => CaseModel::class,
        'patient_ids' => PatientId::class,
        'family_members' => PatientFamilyMember::class,
        'watchers' => PatientWatcher::class,
        'caretakers' => PatientCaretaker::class,
        'documents' => Document::class,
        'intake_sheets' => UnifiedIntakeSheet::class,
    ];

    /**
     * Merge a duplicate patient (source) into a surviving one (target):
     * reassign every owned record, archive the source, and record the exact
     * set of records moved so the merge can be reversed later.
     */
    public function merge(Patient $source, Patient $target, ?User $actor = null): Patient
    {
        if ($source->is($target)) {
            throw ValidationException::withMessages([
                'target_id' => 'A patient cannot be merged into itself.',
            ]);
        }

        return DB::transaction(function () use ($source, $target, $actor) {
            $manifest = [];

            foreach (self::REASSIGNABLE as $key => $model) {
                $ids = $model::query()->where('patient_id', $source->id)->pluck('id')->all();
                $manifest[$key] = $ids;

                if ($ids !== []) {
                    $model::query()->whereIn('id', $ids)->update(['patient_id' => $target->id]);
                }
            }

            $source->delete();

            PatientMerge::create([
                'source_patient_id' => $source->id,
                'target_patient_id' => $target->id,
                'manifest' => $manifest,
                'performed_by' => $actor?->id ?? auth()->id(),
            ]);

            activity()
                ->performedOn($target)
                ->withProperties(['merged_patient_id' => $source->id])
                ->log('patient_merged');

            return $target->fresh();
        });
    }

    /**
     * Reverse a merge: move the recorded records back to the source patient and
     * restore it. Only records still attached to the target are moved back, so
     * changes made after the merge are left alone.
     */
    public function reverse(PatientMerge $merge, ?User $actor = null): Patient
    {
        if ($merge->isReversed()) {
            throw ValidationException::withMessages([
                'merge' => 'This merge has already been reversed.',
            ]);
        }

        return DB::transaction(function () use ($merge, $actor) {
            $source = Patient::withTrashed()->findOrFail($merge->source_patient_id);

            foreach (self::REASSIGNABLE as $key => $model) {
                $ids = $merge->manifest[$key] ?? [];

                if ($ids !== []) {
                    $model::query()
                        ->whereIn('id', $ids)
                        ->where('patient_id', $merge->target_patient_id)
                        ->update(['patient_id' => $source->id]);
                }
            }

            $source->restore();

            $merge->update([
                'reversed_at' => now(),
                'reversed_by' => $actor?->id ?? auth()->id(),
            ]);

            activity()
                ->performedOn($source)
                ->withProperties(['unmerged_from_patient_id' => $merge->target_patient_id])
                ->log('patient_merge_reversed');

            return $source->fresh();
        });
    }

    /**
     * The most recent un-reversed merge into a patient, if any.
     */
    public function latestActiveMergeInto(Patient $target): ?PatientMerge
    {
        return PatientMerge::query()
            ->where('target_patient_id', $target->id)
            ->whereNull('reversed_at')
            ->latest()
            ->first();
    }
}
