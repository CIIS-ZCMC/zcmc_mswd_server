<?php

namespace App\Services;

use App\Repositories\Contracts\TransactionTypeRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\QueryException;

class TransactionTypeService
{
    public function __construct(protected TransactionTypeRepositoryInterface $repository) {}

    /**
     * Every transaction-type lookup row. Returns an empty collection rather than
     * throwing when the HIS is unreachable — the SQL Server is down on every
     * development machine and can blink in production, so a lookup list must
     * render empty, not 500.
     */
    public function all(): Collection
    {
        try {
            return $this->repository->all();
        } catch (QueryException $e) {
            report($e);

            return new Collection;
        }
    }
}
