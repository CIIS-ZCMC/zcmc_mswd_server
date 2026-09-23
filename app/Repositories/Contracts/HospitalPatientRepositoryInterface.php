<?php

namespace App\Repositories\Contracts;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Read-only access to hospital (SQL Server) patient records. Intentionally does
 * NOT extend RepositoryInterface — the HIS is an external source of truth, so
 * no create/update/delete is exposed.
 */
interface HospitalPatientRepositoryInterface
{
    public function paginate(?string $search = null, int $perPage = 15, ?int $page = null): LengthAwarePaginator;

    public function find(int|string $id): ?Model;

    /**
     * Every HIS patient in the given set of surrogate keys (PK_emdPatients),
     * personal data eager loaded, for a bulk import.
     *
     * @param  list<int|string>  $ids
     */
    public function findManyByKeys(array $ids): Collection;

    /**
     * A single patient with personal data and transactions (+guarantors) eager
     * loaded, for the aggregate read. Null when the id matches no HIS patient.
     */
    public function findWithTransactions(int|string $id): ?Model;

    /**
     * One-box lookup matching a term against the hospital number OR name.
     */
    public function search(string $term, int $limit = 20): Collection;

    /**
     * Find patients by name and/or hospital number (name matches can be many, e.g. "Juan").
     */
    public function findByNameAndHospitalNumber(?string $name = null, int|string|null $hospitalNumber = null): Collection;
}
