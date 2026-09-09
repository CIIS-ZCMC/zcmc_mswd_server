<?php

namespace App\Console\Commands;

use App\Models\CaseModel;
use App\Models\CaseWatcher;
use App\Models\Patient;
use App\Models\WatcherRelationshipType;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * One-time migration from the patient-scoped patient_watchers model to
 * episode-scoped case_watchers — docs/WATCHER_LOGIC_PLAN.md §7 (Phase 5).
 *
 * patient_watchers rows are never touched or deleted; they stay the
 * directory. This only reads them and writes case_watchers + the
 * watcher_legacy_exempt flag. Reversible by truncating case_watchers and
 * resetting watcher_legacy_exempt to false — no other table is affected.
 */
class BackfillCaseWatchers extends Command
{
    protected $signature = 'mss:backfill-case-watchers
        {--dry-run : Report what would change without writing anything}
        {--before= : Cutover date (YYYY-MM-DD); cases opened before it are exempted. Defaults to today.}';

    protected $description = 'Copy each patient\'s directory watchers onto their most recent case, and exempt pre-cutover cases from the watcher requirement';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $cutoff = $this->option('before') !== null
            ? Carbon::parse($this->option('before'))->startOfDay()
            : now();

        if ($dryRun) {
            $this->comment('Dry run — no changes will be written.');
        }

        $this->backfillDirectoryWatchers($dryRun);
        $this->exemptLegacyCases($cutoff, $dryRun);

        return self::SUCCESS;
    }

    private function backfillDirectoryWatchers(bool $dryRun): void
    {
        $created = 0;
        $skipped = 0;

        Patient::has('cases')->with(['watchers', 'latestCase'])
            ->chunkById(100, function ($patients) use ($dryRun, &$created, &$skipped) {
                foreach ($patients as $patient) {
                    $case = $patient->latestCase;

                    if ($case === null || $patient->watchers->isEmpty()) {
                        continue;
                    }

                    $primaryAlreadyAssigned = false;

                    foreach ($patient->watchers as $directoryEntry) {
                        if (CaseWatcher::where('case_id', $case->id)->where('patient_watcher_id', $directoryEntry->id)->exists()) {
                            $skipped++;

                            continue;
                        }

                        // Legacy data may predate the "one live primary" rule
                        // (Phase 1) and have more than one is_primary row —
                        // only the first one wins, or the insert would
                        // violate the unique index.
                        $isPrimary = (bool) $directoryEntry->is_primary && ! $primaryAlreadyAssigned;
                        $primaryAlreadyAssigned = $primaryAlreadyAssigned || $isPrimary;

                        $relationship = $this->resolveRelationship($directoryEntry->relationship);

                        if (! $dryRun) {
                            CaseWatcher::create([
                                'case_id' => $case->id,
                                'patient_watcher_id' => $directoryEntry->id,
                                'name' => $directoryEntry->name,
                                'relationship' => $relationship,
                                'contact_number' => $directoryEntry->contact_number,
                                'address' => $directoryEntry->address,
                                'is_primary' => $isPrimary,
                                // No human actor performed this write; the
                                // worker already responsible for the case is
                                // the closest meaningful attribution.
                                'added_by' => $case->assigned_user_id,
                            ]);
                        }

                        $created++;

                        Log::info('mss:backfill-case-watchers: backfilled a case watcher', [
                            'dry_run' => $dryRun,
                            'patient_id' => $patient->id,
                            'case_id' => $case->id,
                            'patient_watcher_id' => $directoryEntry->id,
                            'relationship' => $relationship,
                            'relationship_source' => $directoryEntry->relationship,
                            'is_primary' => $isPrimary,
                        ]);
                    }
                }
            });

        $this->info("Directory backfill: {$created} case_watchers row(s) to create, {$skipped} already present.");
    }

    /**
     * Best-effort match against the seeded master list (case-insensitive,
     * by code or name); legacy free text that doesn't match falls back to
     * "other" rather than blocking the backfill on a data-quality issue.
     */
    private function resolveRelationship(?string $legacy): string
    {
        if ($legacy === null) {
            return 'other';
        }

        $normalized = Str::of($legacy)->lower()->trim()->toString();

        $match = WatcherRelationshipType::query()
            ->whereRaw('LOWER(code) = ?', [$normalized])
            ->orWhereRaw('LOWER(name) = ?', [$normalized])
            ->value('code');

        return $match ?? 'other';
    }

    private function exemptLegacyCases(Carbon $cutoff, bool $dryRun): void
    {
        $query = CaseModel::withTrashed()
            ->where('date_opened', '<', $cutoff)
            ->where('watcher_legacy_exempt', false);

        $count = $query->count();

        if (! $dryRun) {
            $query->update(['watcher_legacy_exempt' => true]);
        }

        $this->info("Legacy exemption: {$count} case(s) opened before {$cutoff->toDateString()} marked watcher_legacy_exempt.");

        Log::info('mss:backfill-case-watchers: exempted legacy cases', [
            'dry_run' => $dryRun,
            'cutoff' => $cutoff->toDateString(),
            'count' => $count,
        ]);
    }
}
