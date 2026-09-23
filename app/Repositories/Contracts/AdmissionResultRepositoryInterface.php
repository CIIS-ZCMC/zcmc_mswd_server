<?php

namespace App\Repositories\Contracts;

use Illuminate\Database\Eloquent\Collection;

/**
 * Read-only access to the hospital (SQL Server) admission-result lookup table.
 * Intentionally does NOT extend RepositoryInterface — the HIS is an external
 * source of truth, so no create/update/delete is exposed.
 */
interface AdmissionResultRepositoryInterface
{
    /**
     * Every admission-result row, ordered by primary key.
     */
    public function all(): Collection;
}
