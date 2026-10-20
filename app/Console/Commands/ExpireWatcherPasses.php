<?php

namespace App\Console\Commands;

use App\Models\CaseWatcher;
use Illuminate\Console\Command;

/**
 * Marks ward passes whose valid-until date has passed as expired. Without this,
 * `pass_status` only ever moves between active and revoked and
 * `pass_valid_until` is display-only. docs/WATCHER_MODULE_PLAN.md, Phase 4.
 */
class ExpireWatcherPasses extends Command
{
    protected $signature = 'mss:expire-watcher-passes';

    protected $description = 'Mark watcher passes past their valid-until date as expired';

    public function handle(): int
    {
        $expired = 0;

        // Updated one by one, not in bulk, so each change reaches the audit log.
        CaseWatcher::query()
            ->where('pass_status', 'active')
            ->whereNotNull('pass_number')
            ->whereDate('pass_valid_until', '<', today())
            ->each(function (CaseWatcher $watcher) use (&$expired) {
                $watcher->update(['pass_status' => 'expired']);
                $expired++;
            });

        $this->info("Expired {$expired} watcher pass(es).");

        return self::SUCCESS;
    }
}
