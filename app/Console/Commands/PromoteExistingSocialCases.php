<?php

namespace App\Console\Commands;

use App\DTOs\SocialCaseDto;
use App\Models\CaseModel;
use App\Models\User;
use App\Services\SocialCaseService;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

/**
 * Opt-in backfill for a ward migrating a paper SCSR backlog —
 * docs/SOCIAL_CASE_PLAN.md §A.0.
 *
 * Deliberately not run by default and not wired into any deploy step:
 * auto-promoting every open case fills the caseload queue with empty drafts
 * nobody wrote, which is worse than an empty queue. Reach for it only with
 * --case=, or knowingly for one ward's backlog.
 */
class PromoteExistingSocialCases extends Command
{
    protected $signature = 'mss:promote-social-cases
        {--dry-run : Report what would change without writing anything}
        {--case= : Promote only this case id}';

    protected $description = 'Start a draft social case study on cases that do not have one yet (opt-in backfill)';

    public function handle(SocialCaseService $service): int
    {
        $dryRun = (bool) $this->option('dry-run');

        if ($dryRun) {
            $this->comment('Dry run — no changes will be written.');
        }

        $query = CaseModel::query()
            ->whereDoesntHave('socialCase')
            ->when($this->option('case') !== null, fn ($q) => $q->whereKey($this->option('case')));

        if ($this->option('case') === null && ! $this->confirmToProceed($query->count())) {
            return self::FAILURE;
        }

        $promoted = 0;
        $skipped = 0;

        $query->with('assignedUser')->chunkById(100, function ($cases) use ($service, $dryRun, &$promoted, &$skipped) {
            foreach ($cases as $case) {
                // The assigned worker authored the case, so they are the right
                // `prepared_by` — falling back to the first admin only when a
                // case carries no assignment at all.
                $author = $case->assignedUser ?? User::query()->oldest('id')->first();

                if ($author === null) {
                    $this->warn("Case {$case->case_code}: no user to attribute the draft to — skipped.");
                    $skipped++;

                    continue;
                }

                if ($dryRun) {
                    $this->line("Would promote case {$case->case_code}.");
                    $promoted++;

                    continue;
                }

                try {
                    $scsr = $service->start($case, $author, SocialCaseDto::fromArray([]));
                    $this->line("Case {$case->case_code} → {$scsr->social_case_no}");
                    $promoted++;
                } catch (ValidationException $e) {
                    $this->warn("Case {$case->case_code}: ".collect($e->errors())->flatten()->first());
                    $skipped++;
                }
            }
        });

        $this->info(($dryRun ? 'Would promote' : 'Promoted').": {$promoted}, skipped: {$skipped}");

        return self::SUCCESS;
    }

    private function confirmToProceed(int $count): bool
    {
        return $this->option('no-interaction')
            || $this->confirm("This will open an empty draft social case study on {$count} case(s). Continue?", false);
    }
}
