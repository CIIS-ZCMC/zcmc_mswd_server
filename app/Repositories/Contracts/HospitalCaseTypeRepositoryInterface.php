<?php

namespace App\Repositories\Contracts;

use Illuminate\Database\Eloquent\Collection;

/**
 * Read-only access to the hospital (SQL Server) case-type lookup table.
 * Intentionally does NOT extend RepositoryInterface — the HIS is an external
 * source of truth, so no create/update/delete is exposed.
 */
interface HospitalCaseTypeRepositoryInterface
{
    /**
     * Every case-type row, ordered by primary key.
     */
    public function all(): Collection;
}
