<?php

namespace App\Services;

use App\Models\Assessment;
use Illuminate\Database\QueryException;

/**
 * Sequential SCSR control numbers — the same count-based pattern as
 * WatcherPassNumberService and UnifiedIntakeSheetService::nextIntakeNumber().
 *
 * That pattern races: two concurrent finalizations can COUNT the same value.
 * `assessments.social_case_no` is uniquely indexed, so the race surfaces as a
 * duplicate-key QueryException rather than two identical control numbers —
 * and the retry here turns that 500 into a success. Flagged in the plan as P3;
 * the same treatment still wants back-porting to UIS- and CASE-.
 */
class SocialCaseNumberService
{
    private const ATTEMPTS = 3;

    /**
     * @param  callable(string): mixed  $persist  Writes the number; may throw on collision.
     */
    public function assign(callable $persist): mixed
    {
        for ($attempt = 1; $attempt <= self::ATTEMPTS; $attempt++) {
            try {
                return $persist($this->next());
            } catch (QueryException $e) {
                if ($attempt === self::ATTEMPTS || ! $this->isDuplicateKey($e)) {
                    throw $e;
                }
            }
        }

        // Unreachable: the loop either returns or rethrows on its last attempt.
        throw new \LogicException('Could not assign a social case number.');
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

    private function isDuplicateKey(QueryException $e): bool
    {
        // 23000/23505 are the SQLSTATE integrity-constraint classes MySQL,
        // MariaDB, Postgres and SQLite all report a unique collision under.
        return in_array($e->getCode(), ['23000', '23505'], true);
    }
}
