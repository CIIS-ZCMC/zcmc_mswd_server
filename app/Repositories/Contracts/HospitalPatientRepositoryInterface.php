<?php

namespace App\Repositories\Contracts;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;

/**
 * Read-only access to hospital (SQL Server) patient records. Intentionally does
 * NOT extend RepositoryInterface — the HIS is an external source of truth, so
 * no create/update/delete is exposed.
 */
interface HospitalPatientRepositoryInterface
{
    public function paginate(?string $search = null, int $perPage = 15): LengthAwarePaginator;

    public function find(int|string $id): ?Model;

    /**
     * Find a single patient by name and/or hospital number.
     */
    public function findByNameAndHospitalNumber(?string $name = null, int|string|null $hospitalNumber = null): ?Model;
}
