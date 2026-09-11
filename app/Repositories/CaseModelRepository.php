<?php

namespace App\Repositories;

use App\Models\CaseModel;
use App\Repositories\Contracts\CaseModelRepositoryInterface;
use App\Support\ListQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class CaseModelRepository extends BaseRepository implements CaseModelRepositoryInterface
{
    /** @var list<string> */
    protected array $searchable = ['case_code', 'patient.last_name', 'patient.first_name'];

    /** @var list<string> */
    protected array $filterable = [
        'status', 'case_type', 'priority_level', 'assigned_user_id', 'patient_id',
        'is_protective', 'admission_type',
    ];

    /** @var list<string> */
    protected array $sortable = ['case_code', 'date_opened', 'status', 'priority_level', 'created_at'];

    protected string $defaultSort = 'date_opened';

    protected string $defaultDirection = 'desc';

    /** @var list<string> */
    protected array $listWith = ['patient', 'assignedUser', 'socialCase'];

    public function __construct(CaseModel $model)
    {
        parent::__construct($model);
    }

    /**
     * One worker's own caseload, narrowed by case status and by where each
     * case's social case study has got to.
     *
     * A dedicated method rather than a `filter[assigned_user_id]=me` special
     * case: applyFilters() passes filter values straight into where(), so a
     * magic string would have to be parsed inside the generic filter path and
     * would leak into every repository.
     *
     * @param  list<string>  $statuses
     */
    public function paginateCaseload(
        int $userId,
        array $statuses,
        ?string $socialCaseStatus,
        ListQuery $query,
    ): LengthAwarePaginator {
        $builder = $this->model->newQuery()
            ->with($this->listWith)
            ->where('assigned_user_id', $userId)
            ->whereIn('status', $statuses);

        $this->applySocialCaseStatus($builder, $socialCaseStatus);
        $this->applySearch($builder, $query);
        $this->applySort($builder, $query);

        return $builder->paginate(perPage: $query->perPage, page: $query->page);
    }

    /**
     * The same narrowing as paginateCaseload(), counted per social-case bucket
     * in a single grouped query rather than once per bucket.
     *
     * @param  list<string>  $statuses
     * @return array<string, int>
     */
    public function caseloadBuckets(int $userId, array $statuses): array
    {
        $counts = $this->model->newQuery()
            ->where('cases.assigned_user_id', $userId)
            ->whereIn('cases.status', $statuses)
            ->leftJoin('assessments', function ($join) {
                $join->on('assessments.case_id', '=', 'cases.id')
                    ->whereNotNull('assessments.social_case_status')
                    ->whereNull('assessments.deleted_at');
            })
            ->selectRaw('assessments.social_case_status as bucket, COUNT(*) as aggregate')
            ->groupBy('bucket')
            ->pluck('aggregate', 'bucket');

        return [
            'none' => (int) ($counts[''] ?? $counts[null] ?? 0),
            'draft' => (int) ($counts['draft'] ?? 0),
            'for_review' => (int) ($counts['for_review'] ?? 0),
            'finalized' => (int) ($counts['finalized'] ?? 0),
        ];
    }

    /**
     * @param  Builder<CaseModel>  $builder
     */
    private function applySocialCaseStatus(Builder $builder, ?string $socialCaseStatus): void
    {
        if ($socialCaseStatus === null) {
            return;
        }

        $socialCaseStatus === 'none'
            ? $builder->whereDoesntHave('socialCase')
            : $builder->whereHas('socialCase', fn (Builder $q) => $q->where('social_case_status', $socialCaseStatus));
    }
}
