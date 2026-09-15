<?php

namespace App\Services;

use App\Models\Bizbox\PatientTransaction;
use App\Repositories\Contracts\PatientTransactionRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class PatientTransactionService
{
    public function __construct(protected PatientTransactionRepositoryInterface $repository) {}

    public function paginate(?string $search = null, ?string $date = null, int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($search, $date, $perPage);
    }

    public function find(int|string $id): PatientTransaction
    {
        return $this->repository->find($id)
            ?? throw (new ModelNotFoundException)->setModel(PatientTransaction::class, [$id]);
    }

    /**
     * Candidate HIS transactions for a one-box search (name or hospital number),
     * optionally narrowed to a single registration date.
     */
    public function search(string $term, ?string $date = null, int $limit = 20): Collection
    {
        return $this->repository->search($term, $date, $limit);
    }

    /**
     * Find transactions by name and/or hospital number (404 when none match),
     * optionally narrowed to a single registration date.
     */
    public function findByNameAndHospitalNumber(?string $name = null, int|string|null $hospitalNumber = null, ?string $date = null): Collection
    {
        $transactions = $this->repository->findByNameAndHospitalNumber($name, $hospitalNumber, $date);

        if ($transactions->isEmpty()) {
            throw (new ModelNotFoundException)->setModel(PatientTransaction::class);
        }

        return $transactions;
    }
}
