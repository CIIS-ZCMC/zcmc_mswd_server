<?php

namespace App\Support;

use Illuminate\Database\QueryException;

/**
 * Control numbers (SCSR-, PASS-) are read as "highest so far + 1" and written
 * back, which races: two concurrent requests can pick the same number. The
 * column is uniquely indexed, so the race surfaces as a duplicate-key
 * QueryException rather than two identical numbers — retrying with a freshly
 * read number turns that 500 into a success.
 */
class RetriesOnDuplicateKey
{
    private const ATTEMPTS = 3;

    /**
     * @template T
     *
     * @param  callable(): T  $attempt  Reads a fresh number and writes it; may throw on collision.
     * @return T
     */
    public static function run(callable $attempt): mixed
    {
        for ($try = 1; $try <= self::ATTEMPTS; $try++) {
            try {
                return $attempt();
            } catch (QueryException $e) {
                if ($try === self::ATTEMPTS || ! self::isDuplicateKey($e)) {
                    throw $e;
                }
            }
        }

        // Unreachable: the loop either returns or rethrows on its last attempt.
        throw new \LogicException('Could not assign a control number.');
    }

    private static function isDuplicateKey(QueryException $e): bool
    {
        // 23000/23505 are the SQLSTATE integrity-constraint classes MySQL,
        // MariaDB, Postgres and SQLite all report a unique collision under.
        return in_array($e->getCode(), ['23000', '23505'], true);
    }
}
