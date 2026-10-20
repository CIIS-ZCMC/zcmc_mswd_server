<?php

namespace App\Services;

use App\Enums\WatcherRequirement;
use App\Models\CaseModel;
use App\Models\CaseWatcher;
use App\Models\PatientWatcher;
use App\Support\RetriesOnDuplicateKey;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Model invariants for case watchers — enforced here rather than only in form
 * requests, since Filament and seeders bypass requests. A case watcher is an
 * assignment of a patient's watcher to one open case; the person's own details
 * live on the PatientWatcher. See docs/WATCHER_MODULE_PLAN.md.
 */
class CaseWatcherService
{
    public function __construct(
        protected WatcherRequirementService $requirements,
        protected WatcherPassNumberService $passNumbers,
    ) {}

    /**
     * Assigns a patient watcher to a case. Pass `$newWatcher` instead of a
     * `patient_watcher_id` to create the person for the case's patient and
     * assign them in one transaction.
     *
     * @param  array<string, mixed>  $attributes  Assignment fields (case_id, patient_watcher_id, is_primary, ...).
     * @param  array<string, mixed>|null  $newWatcher  last_name, first_name, middle_name, relationship_code, contact_number, address, notes.
     */
    public function create(array $attributes, ?array $newWatcher = null): CaseWatcher
    {
        return DB::transaction(function () use ($attributes, $newWatcher) {
            $case = CaseModel::findOrFail($attributes['case_id']);
            $this->assertCaseIsOpen($case);

            if ($newWatcher !== null) {
                $attributes['patient_watcher_id'] = PatientWatcher::create([
                    'patient_id' => $case->patient_id,
                    'last_name' => $newWatcher['last_name'],
                    'first_name' => $newWatcher['first_name'],
                    'middle_name' => $newWatcher['middle_name'] ?? null,
                    'relationship_code' => $newWatcher['relationship_code'],
                    'contact_number' => $newWatcher['contact_number'] ?? null,
                    'address' => $newWatcher['address'] ?? null,
                    'notes' => $newWatcher['notes'] ?? null,
                    'added_by' => $attributes['added_by'] ?? null,
                ])->id;
            } else {
                $this->assertBelongsToPatient($attributes['patient_watcher_id'], $case);
            }

            $alreadyAssigned = CaseWatcher::where('case_id', $case->id)
                ->where('patient_watcher_id', $attributes['patient_watcher_id'])
                ->exists();

            if ($alreadyAssigned) {
                throw ValidationException::withMessages([
                    'patient_watcher_id' => 'This watcher is already assigned to the case.',
                ]);
            }

            if ($attributes['is_primary'] ?? false) {
                $this->demoteExistingPrimary($case->id);
            }

            return CaseWatcher::create($attributes);
        });
    }

    /**
     * Generic assignment update. is_primary is deliberately not accepted here;
     * promotion only ever happens through promote(), so the demote-then-set
     * atomicity can't be bypassed.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function update(CaseWatcher $watcher, array $attributes): CaseWatcher
    {
        $this->assertCaseIsOpen($watcher->case);

        $watcher->update($attributes);

        return $watcher->refresh();
    }

    /**
     * Promotes $watcher to primary, atomically demoting whichever watcher
     * currently holds it on the same case — never two client calls, so
     * there's no window where a case has zero or two live primaries.
     */
    public function promote(CaseWatcher $watcher): CaseWatcher
    {
        $this->assertCaseIsOpen($watcher->case);

        return DB::transaction(function () use ($watcher) {
            $this->demoteExistingPrimary($watcher->case_id, except: $watcher->id);
            $watcher->update(['is_primary' => true]);

            return $watcher->refresh();
        });
    }

    /**
     * Unassigns the watcher from the case (the patient watcher stays). Rejects
     * removing the last primary watcher on a case that requires one. To swap
     * instead of removing outright, call promote() on the replacement first —
     * it demotes $watcher, so this then succeeds.
     */
    public function remove(CaseWatcher $watcher): bool
    {
        // Refresh first: a caller that just promoted a replacement (demoting
        // this watcher via a separate query) may still be holding a stale
        // in-memory copy where is_primary reads true.
        $watcher->refresh();

        $this->assertCaseIsOpen($watcher->case);

        if ($watcher->is_primary && $this->requirements->resolve($watcher->case) === WatcherRequirement::Required) {
            throw ValidationException::withMessages([
                'watcher' => 'This case requires a registered watcher. Promote a replacement or file a waiver before removing the last one.',
            ]);
        }

        return $watcher->delete();
    }

    public function issuePass(CaseWatcher $watcher, ?string $validUntil = null): CaseWatcher
    {
        $this->assertCaseIsOpen($watcher->case);

        RetriesOnDuplicateKey::run(fn () => $watcher->update([
            'pass_number' => $this->passNumbers->next(),
            'pass_valid_until' => $validUntil,
            'pass_status' => 'active',
        ]));

        return $watcher->refresh();
    }

    public function revokePass(CaseWatcher $watcher): CaseWatcher
    {
        $this->assertCaseIsOpen($watcher->case);

        $watcher->update(['pass_status' => 'revoked']);

        return $watcher->refresh();
    }

    /**
     * Assignments on closed or referred cases are history: the case is no
     * longer being handled, so nothing about its watchers changes.
     */
    private function assertCaseIsOpen(CaseModel $case): void
    {
        if (! in_array($case->status, [CaseModel::STATUS_OPEN, CaseModel::STATUS_ONGOING], true)) {
            throw ValidationException::withMessages([
                'case' => 'Watchers can only be changed on an open case.',
            ]);
        }
    }

    private function assertBelongsToPatient(int $patientWatcherId, CaseModel $case): void
    {
        $belongs = PatientWatcher::whereKey($patientWatcherId)->where('patient_id', $case->patient_id)->exists();

        if (! $belongs) {
            throw ValidationException::withMessages([
                'patient_watcher_id' => 'The watcher does not belong to this case\'s patient.',
            ]);
        }
    }

    private function demoteExistingPrimary(int $caseId, ?int $except = null): void
    {
        CaseWatcher::where('case_id', $caseId)
            ->where('is_primary', true)
            ->when($except !== null, fn ($query) => $query->whereKeyNot($except))
            ->update(['is_primary' => false]);
    }
}
