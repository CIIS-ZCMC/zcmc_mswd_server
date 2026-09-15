<?php

namespace App\Repositories\Contracts;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Read-only access to hospital (SQL Server) guarantor ledger rows.
 * Intentionally does NOT extend RepositoryInterface — the HIS is an external
 * source of truth, so no create/update/delete is exposed.
 */
interface PatientGuarantorRepositoryInterface
{
    /**
     * Every guarantor recorded against one registration (psPatRegisters key).
     * An admission with no guarantor yields an empty collection.
     */
    public function forRegistration(int|string $registrationId): Collection;

    public function find(int|string $id): ?Model;
}
