<?php

namespace App\Repositories;

use App\Models\Patient;
use App\Repositories\Contracts\PatientRepositoryInterface;
use App\Support\ListQuery;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class PatientRepository extends BaseRepository implements PatientRepositoryInterface
{
    /** @var list<string> */
    protected array $searchable = ['mswd_id', 'hospital_id', 'first_name', 'middle_name', 'last_name', 'barangay'];

    /** @var list<string> */
    protected array $filterable = ['sector_id', 'sex'];

    /** @var list<string> */
    protected array $sortable = ['mswd_id', 'last_name', 'first_name', 'created_at'];

    protected string $defaultSort = 'last_name';

    /** @var list<string> */
    protected array $listWith = ['sector', 'latestCase', 'latestAssessment'];

    /** @var list<string> */
    protected array $listWithCount = ['cases'];

    public function __construct(Patient $model)
    {
        parent::__construct($model);
    }

    public function matchByIdentity(string $lastName, string $firstName, ?string $birthdate = null): Collection
    {
        return $this->model->newQuery()
            ->whereRaw('LOWER(last_name) = ?', [mb_strtolower($lastName)])
            ->whereRaw('LOWER(first_name) = ?', [mb_strtolower($firstName)])
            ->when($birthdate !== null, fn ($query) => $query->whereDate('birthdate', $birthdate))
            ->orderBy('last_name')
            ->limit(20)
            ->get();
    }

    /**
     * `classification` and `intake_date` live on related tables, so
     * BaseRepository::applyFilters' plain `where($column, $value)` can't
     * reach them. `sector_id` / `sex` still fall through to it below.
     *
     * @param  Builder<Patient>  $builder
     */
    protected function applyFilters(Builder $builder, ListQuery $query): void
    {
        if (array_key_exists('classification', $query->filters)) {
            $classification = $query->filters['classification'];

            // Matches the patient's *current* classification (latestAssessment),
            // not "ever had" — a superseded assessment must not match.
            $builder->whereHas('latestAssessment', fn (Builder $q) => is_array($classification)
                ? $q->whereIn('classification', $classification)
                : $q->where('classification', $classification));
        }

        if (array_key_exists('intake_date', $query->filters)) {
            $intakeDate = $query->filters['intake_date'];

            $builder->whereHas('cases', fn (Builder $q) => $q->whereDate('date_opened', $intakeDate));
        }

        parent::applyFilters($builder, $query);
    }
}
