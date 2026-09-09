<?php

namespace App\Services;

use App\Enums\WatcherRequirement;
use App\Models\CaseWatcher;
use App\Models\WatcherRelationshipType;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Model invariants for case_watchers — enforced here rather than only in
 * form requests, since Filament and seeders bypass requests. See
 * docs/WATCHER_LOGIC_PLAN.md §4.
 */
class CaseWatcherService
{
    public function __construct(
        protected WatcherRequirementService $requirements,
        protected WatcherPassNumberService $passNumbers,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): CaseWatcher
    {
        $this->assertKnownRelationship($attributes['relationship'] ?? null);

        return DB::transaction(function () use ($attributes) {
            if ($attributes['is_primary'] ?? false) {
                $this->demoteExistingPrimary($attributes['case_id']);
            }

            return CaseWatcher::create($attributes);
        });
    }

    /**
     * Promotes $watcher to primary, atomically demoting whichever watcher
     * currently holds it on the same case — never two client calls, so
     * there's no window where a case has zero or two live primaries.
     */
    public function promote(CaseWatcher $watcher): CaseWatcher
    {
        return DB::transaction(function () use ($watcher) {
            $this->demoteExistingPrimary($watcher->case_id, except: $watcher->id);
            $watcher->update(['is_primary' => true]);

            return $watcher->refresh();
        });
    }

    /**
     * Rejects removing the last primary watcher on a case that requires
     * one. To swap instead of removing outright, call promote() on the
     * replacement first — it demotes $watcher, so this then succeeds.
     */
    public function remove(CaseWatcher $watcher): bool
    {
        // Refresh first: a caller that just promoted a replacement (demoting
        // this watcher via a separate query) may still be holding a stale
        // in-memory copy where is_primary reads true.
        $watcher->refresh();

        if ($watcher->is_primary && $this->requirements->resolve($watcher->case) === WatcherRequirement::Required) {
            throw ValidationException::withMessages([
                'watcher' => 'This case requires a registered watcher. Promote a replacement or file a waiver before removing the last one.',
            ]);
        }

        return $watcher->delete();
    }

    public function issuePass(CaseWatcher $watcher, ?string $validUntil = null): CaseWatcher
    {
        $watcher->update([
            'pass_number' => $this->passNumbers->next(),
            'pass_valid_until' => $validUntil,
            'pass_status' => 'active',
        ]);

        return $watcher->refresh();
    }

    public function revokePass(CaseWatcher $watcher): CaseWatcher
    {
        $watcher->update(['pass_status' => 'revoked']);

        return $watcher->refresh();
    }

    private function demoteExistingPrimary(int $caseId, ?int $except = null): void
    {
        CaseWatcher::where('case_id', $caseId)
            ->where('is_primary', true)
            ->when($except !== null, fn ($query) => $query->whereKeyNot($except))
            ->update(['is_primary' => false]);
    }

    private function assertKnownRelationship(?string $relationship): void
    {
        if ($relationship === null || ! WatcherRelationshipType::where('code', $relationship)->exists()) {
            throw ValidationException::withMessages([
                'relationship' => 'The selected relationship is not recognised.',
            ]);
        }
    }
}
