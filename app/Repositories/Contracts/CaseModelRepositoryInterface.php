<?php

namespace App\Repositories\Contracts;

use App\Support\ListQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface CaseModelRepositoryInterface extends RepositoryInterface
{
    /**
     * @param  list<string>  $statuses
     */
    public function paginateCaseload(
        int $userId,
        array $statuses,
        ?string $socialCaseStatus,
        ListQuery $query,
    ): LengthAwarePaginator;

    /**
     * @param  list<string>  $statuses
     * @return array<string, int>
     */
    public function caseloadBuckets(int $userId, array $statuses): array;
}
