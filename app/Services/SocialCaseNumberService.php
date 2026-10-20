<?php

namespace App\Services;

use App\Models\Assessment;
use App\Support\RetriesOnDuplicateKey;

/**
 * Sequential SCSR control numbers — the same count-based pattern as
 * CaseModelService::nextCaseCode().
 *
 * That pattern races: two concurrent finalizations can COUNT the same value.
 * `assessments.social_case_no` is uniquely indexed, so the race surfaces as a
 * duplicate-key QueryException rather than two identical control numbers —
 * and the retry here turns that 500 into a success. Flagged in the plan as P3;
 * the same treatment still wants back-porting to UIS- and CASE-.
 */
class SocialCaseNumberService
{
    /**
     * @param  callable(string): mixed  $persist  Writes the number; may throw on collision.
     */
    public function assign(callable $persist): mixed
    {
        return RetriesOnDuplicateKey::run(fn () => $persist($this->next()));
    }

    public function next(): string
    {
        $year = now()->year;
        $sequence = Assessment::withTrashed()
            ->whereYear('created_at', $year)
            ->whereNotNull('social_case_no')
            ->count() + 1;

        return sprintf('SCSR-%d-%06d', $year, $sequence);
    }
}
