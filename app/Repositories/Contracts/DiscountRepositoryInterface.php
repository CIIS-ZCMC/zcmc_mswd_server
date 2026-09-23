<?php

namespace App\Repositories\Contracts;

use Illuminate\Database\Eloquent\Collection;

/**
 * Read-only access to the hospital (SQL Server) discount lookup table.
 * Intentionally does NOT extend RepositoryInterface — the HIS is an external
 * source of truth, so no create/update/delete is exposed.
 */
interface DiscountRepositoryInterface
{
    /**
     * Every discount row, ordered by primary key.
     */
    public function all(): Collection;
}
