<?php

namespace App\Actions;

use App\Exceptions\WatcherRequirementNotSatisfiedException;
use App\Models\CaseModel;
use App\Services\WatcherRequirementService;

/**
 * The one gate every blocking transition in docs/WATCHER_LOGIC_PLAN.md §5
 * calls before proceeding. Invoked from service methods rather than only
 * controllers, so Filament actions and console commands can't bypass it —
 * the same reasoning CaseWatcherService's invariants (Phase 2) already rely
 * on.
 */
class EnsureWatcherRequirementSatisfied
{
    public function __construct(protected WatcherRequirementService $requirements) {}

    /**
     * @param  string  $action  Fills "...before it can {$action}." — e.g. "be closed".
     */
    public function __invoke(CaseModel $case, string $action): void
    {
        $status = $this->requirements->status($case);

        if ($status['blocking']) {
            throw new WatcherRequirementNotSatisfiedException($action, $status);
        }
    }
}
