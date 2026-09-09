<?php

namespace App\Services;

use App\Models\CaseModel;
use App\Models\User;

/**
 * Files or clears the watcher requirement waiver on a case — a section-head
 * level action, gated by the cases.waive_watcher permission at the route.
 */
class WatcherWaiverService
{
    public function file(CaseModel $case, string $reason, ?string $note, User $actor): CaseModel
    {
        $case->update([
            'watcher_waiver_reason' => $reason,
            'watcher_waiver_note' => $note,
            'watcher_waived_by' => $actor->id,
            'watcher_waived_at' => now(),
        ]);

        return $case->refresh();
    }

    public function clear(CaseModel $case): CaseModel
    {
        $case->update([
            'watcher_waiver_reason' => null,
            'watcher_waiver_note' => null,
            'watcher_waived_by' => null,
            'watcher_waived_at' => null,
        ]);

        return $case->refresh();
    }
}
