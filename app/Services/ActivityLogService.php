<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\CaseModel;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Every read of the audit trail goes through here: the two `history()`
 * endpoints, the global audit log, and the inline per-record drill-down.
 *
 * Centralised because the protective-case filter must apply to all of them —
 * a rule enforced in one place is one that cannot be forgotten on the fourth
 * read surface.
 */
class ActivityLogService
{
    public const DEFAULT_PER_PAGE = 25;

    public const MAX_PER_PAGE = 100;

    /**
     * Events a trail row may carry. Anything else in the filter is ignored
     * rather than erroring — an unknown event simply matches nothing.
     *
     * @var list<string>
     */
    private const EVENTS = ['created', 'updated', 'deleted', 'restored'];

    /**
     * A filtered, paginated page of the global log.
     *
     * @param  array<string, mixed>  $filters
     */
    public function paginate(array $filters, ?User $viewer, ?int $perPage = null): LengthAwarePaginator
    {
        $perPage = min($perPage ?: self::DEFAULT_PER_PAGE, self::MAX_PER_PAGE);

        $page = $this->query($filters, $viewer)
            ->with('causer')
            ->latest('id')
            ->paginate($perPage);

        $this->attachSubjectLabels($page->getCollection());

        return $page;
    }

    /**
     * A patient's or a case's trail, capped rather than paginated — both
     * endpoints return a flat array by contract.
     *
     * @param  array<string, mixed>  $filters
     */
    public function collect(array $filters, ?User $viewer, int $limit): Collection
    {
        $rows = $this->query($filters, $viewer)
            ->with('causer')
            ->latest('id')
            ->limit($limit)
            ->get();

        $this->attachSubjectLabels($rows);

        return $rows;
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function query(array $filters, ?User $viewer): Builder
    {
        $query = Activity::query();

        $this->applyProtectiveFilter($query, $viewer);

        return $query
            ->when($filters['patient_id'] ?? null, fn ($q, $id) => $q->where('patient_id', $id))
            ->when($filters['case_id'] ?? null, fn ($q, $id) => $q->where('case_id', $id))
            ->when($filters['user_id'] ?? null, fn ($q, $id) => $q->where('causer_id', $id))
            ->when($filters['log_name'] ?? null, fn ($q, $name) => $q->where('log_name', $name))
            ->when(
                in_array($filters['event'] ?? null, self::EVENTS, true),
                fn ($q) => $q->where('event', $filters['event']),
            )
            ->when(
                $filters['subject_type'] ?? null,
                fn ($q, $type) => $q->where('subject_type', $this->resolveSubjectType($type)),
            )
            ->when($filters['subject_id'] ?? null, fn ($q, $id) => $q->where('subject_id', $id))
            ->when($filters['date_from'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '>=', $date))
            ->when($filters['date_to'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '<=', $date));
    }

    /**
     * Hide protective-case activity from anyone without the permission.
     *
     * Applied here rather than as a global scope on the model, deliberately:
     * Filament and the Phase 2 backfill must still see every row, and a global
     * scope would silently narrow them too.
     *
     * The residual, recorded in the plan: patient-level rows (demographics, IDs,
     * family members) are not case-attached, so a protective patient's existence
     * and demographic edits stay visible to anyone with `patients.view`. Closing
     * that belongs to the Protective Cases module, which owns patient-level
     * restriction.
     */
    private function applyProtectiveFilter(Builder $query, ?User $viewer): void
    {
        if ($viewer?->can('audit.view_protective')) {
            return;
        }

        $query->where(function (Builder $sub) {
            $sub->whereNull('case_id')
                ->orWhereNotIn('case_id', CaseModel::query()
                    ->withTrashed()
                    ->where('is_protective', true)
                    ->select('id'));
        });
    }

    /**
     * `ActivityResource` emits `subject_type` as a class basename, so the
     * filter accepts one back. A fully qualified class name and a registered
     * morph alias both still work.
     */
    private function resolveSubjectType(string $type): string
    {
        if (class_exists($type) || Relation::getMorphedModel($type) !== null) {
            return $type;
        }

        $candidate = 'App\\Models\\'.$type;

        return class_exists($candidate) ? $candidate : $type;
    }

    /**
     * Resolve a human label per row — "Watcher: Maria Cruz" — so the client does
     * not have to reverse-engineer one out of `changes`.
     *
     * Batched by subject type (one `whereIn` per type, ~4–6 queries for a page)
     * rather than resolved per row, which would be an N+1 inside the resource.
     *
     * @param  Collection<int, Activity>  $rows
     */
    private function attachSubjectLabels(Collection $rows): void
    {
        foreach ($rows->groupBy('subject_type') as $type => $group) {
            $class = Relation::getMorphedModel((string) $type) ?? (string) $type;

            if (! class_exists($class)) {
                continue;
            }

            $model = new $class;

            $subjects = $model->newQuery()
                ->when(
                    in_array(SoftDeletes::class, class_uses_recursive($model), true),
                    fn ($query) => $query->withTrashed(),
                )
                ->whereIn($model->getKeyName(), $group->pluck('subject_id')->filter()->unique())
                ->get()
                ->keyBy($model->getKeyName());

            foreach ($group as $row) {
                $subject = $subjects->get($row->subject_id);

                // A deleted subject keeps its type but loses its name. Better a
                // bare type than a fabricated label.
                $row->subject_label = $subject === null
                    ? class_basename($class)
                    : class_basename($class).': '.$this->describe($subject);
            }
        }
    }

    /**
     * The most name-like field a record has.
     */
    private function describe(object $subject): string
    {
        foreach (['name', 'employee_name', 'case_code', 'file_name', 'diagnosis_name', 'intake_no'] as $field) {
            if (! empty($subject->{$field})) {
                return (string) $subject->{$field};
            }
        }

        if (! empty($subject->first_name) || ! empty($subject->last_name)) {
            return trim(($subject->first_name ?? '').' '.($subject->last_name ?? ''));
        }

        return '#'.$subject->getKey();
    }
}
