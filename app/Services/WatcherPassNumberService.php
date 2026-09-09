<?php

namespace App\Services;

use App\Models\CaseWatcher;

/**
 * Sequential, never-reused ward pass numbers — same count-based control
 * number pattern as UnifiedIntakeSheetService::nextIntakeNumber() and
 * ::nextCaseCode().
 */
class WatcherPassNumberService
{
    public function next(): string
    {
        $year = now()->year;
        $sequence = CaseWatcher::withTrashed()
            ->whereYear('created_at', $year)
            ->whereNotNull('pass_number')
            ->count() + 1;

        return sprintf('PASS-%d-%06d', $year, $sequence);
    }
}
