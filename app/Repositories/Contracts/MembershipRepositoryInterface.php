<?php

namespace App\Repositories\Contracts;

use Illuminate\Database\Eloquent\Collection;

/**
 * Read-only access to the hospital (SQL Server) PhilHealth membership lookup
 * table. Intentionally does NOT extend RepositoryInterface — the HIS is an
 * external source of truth, so no create/update/delete is exposed.
 */
interface MembershipRepositoryInterface
{
    /**
     * Every membership row, ordered by primary key.
     */
    public function all(): Collection;
}
