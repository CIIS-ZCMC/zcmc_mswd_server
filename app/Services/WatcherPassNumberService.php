<?php

namespace App\Services;

use App\Models\CaseWatcher;

/**
 * Sequential ward pass numbers: PASS-{year}-{000001}.
 *
 * The next number is one more than the highest already issued this year (deleted
 * rows included), not a row count — a count repeats a number once a pass has
 * been reissued, because reissuing overwrites the old number on the same row.
 * Callers wrap the write in RetriesOnDuplicateKey for the concurrent case.
 */
class WatcherPassNumberService
{
    public function next(): string
    {
        $prefix = sprintf('PASS-%d-', now()->year);

        // Zero-padded, so the lexical maximum is the numeric maximum.
        $highest = CaseWatcher::withTrashed()
            ->where('pass_number', 'like', $prefix.'%')
            ->max('pass_number');

        $sequence = $highest === null ? 1 : ((int) substr($highest, strlen($prefix))) + 1;

        return sprintf('%s%06d', $prefix, $sequence);
    }
}
