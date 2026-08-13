<?php

namespace App\Repositories\Contracts;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Read-only access to hospital (SQL Server) patient records. Intentionally does
 * NOT extend RepositoryInterface — the HIS is an external source of truth, so
 * no create/update/delete is exposed.
 */
interface HospitalPatientRepositoryInterface
{
    /**
     * @return Collection<int, Model>
     */
    public function get(?string $search = null, int $limit = 100): Collection;

    public function find(int|string $id): ?Model;
}
