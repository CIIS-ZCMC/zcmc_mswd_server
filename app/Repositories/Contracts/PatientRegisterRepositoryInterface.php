<?php

namespace App\Repositories\Contracts;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Read-only access to hospital (SQL Server) patient registration records.
 * Intentionally does NOT extend RepositoryInterface — the HIS is an external
 * source of truth, so no create/update/delete is exposed.
 */
interface PatientRegisterRepositoryInterface
{
    public function paginate(?string $search = null, ?string $date = null, int $perPage = 15): LengthAwarePaginator;

    public function find(int|string $id): ?Model;

    /**
     * One-box lookup matching a term against the hospital number OR name, optionally
     * narrowed to a single registration date (registrydate).
     */
    public function search(string $term, ?string $date = null, int $limit = 20): Collection;

    /**
     * Find registrations by patient name and/or hospital number (name matches can be many, e.g. "Juan"),
     * optionally narrowed to a single registration date (registrydate).
     */
    public function findByNameAndHospitalNumber(?string $name = null, int|string|null $hospitalNumber = null, ?string $date = null): Collection;
}
