<?php

namespace App\Repositories;

use App\Repositories\Contracts\RepositoryInterface;
use App\Support\ListQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

abstract class BaseRepository implements RepositoryInterface
{
    /**
     * Columns a `search` term is matched against. Empty means search is ignored.
     *
     * @var list<string>
     */
    protected array $searchable = [];

    /**
     * Columns accepted in `filter[...]`. Anything else is dropped.
     *
     * @var list<string>
     */
    protected array $filterable = [];

    /**
     * Columns accepted in `sort`. Anything else falls back to $defaultSort.
     *
     * @var list<string>
     */
    protected array $sortable = [];

    protected string $defaultSort = 'id';

    protected string $defaultDirection = 'asc';

    /**
     * Relations eager-loaded for list screens, so tables can show related
     * labels without an N+1.
     *
     * @var list<string>
     */
    protected array $listWith = [];

    /**
     * Relation counts exposed on list screens via `whenCounted`.
     *
     * @var list<string>
     */
    protected array $listWithCount = [];

    public function __construct(protected Model $model) {}

    public function all(): Collection
    {
        return $this->model->newQuery()->get();
    }

    public function paginate(int $page = 1, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->newQuery()->paginate(perPage: $perPage, page: $page);
    }

    /**
     * Paginate for a table screen: search, filters, sort and soft-delete scope,
     * each restricted to the columns this repository declares.
     */
    public function paginateList(ListQuery $query): LengthAwarePaginator
    {
        $builder = $this->model->newQuery();

        if ($this->listWith !== []) {
            $builder->with($this->listWith);
        }

        if ($this->listWithCount !== []) {
            $builder->withCount($this->listWithCount);
        }

        $this->applyTrashed($builder, $query);
        $this->applySearch($builder, $query);
        $this->applyFilters($builder, $query);
        $this->applySort($builder, $query);

        return $builder->paginate(perPage: $query->perPage, page: $query->page);
    }

    /**
     * @param  Builder<Model>  $builder
     */
    protected function applyTrashed(Builder $builder, ListQuery $query): void
    {
        // Only meaningful where the model is soft-deletable.
        if (! in_array(SoftDeletes::class, class_uses_recursive($this->model), true)) {
            return;
        }

        match ($query->trashed) {
            ListQuery::TRASHED_WITH => $builder->withTrashed(),
            ListQuery::TRASHED_ONLY => $builder->onlyTrashed(),
            default => null,
        };
    }

    /**
     * @param  Builder<Model>  $builder
     */
    protected function applySearch(Builder $builder, ListQuery $query): void
    {
        if ($query->search === null || $this->searchable === []) {
            return;
        }

        $term = '%'.str_replace(['%', '_'], ['\%', '\_'], $query->search).'%';

        $builder->where(function (Builder $inner) use ($term): void {
            foreach ($this->searchable as $column) {
                // `relation.column` searches through the relation, the way
                // Filament's `searchable()` does on a related column.
                if (str_contains($column, '.')) {
                    [$relation, $related] = explode('.', $column, 2);
                    $inner->orWhereHas($relation, fn (Builder $q) => $q->where($related, 'like', $term));

                    continue;
                }

                $inner->orWhere($column, 'like', $term);
            }
        });
    }

    /**
     * @param  Builder<Model>  $builder
     */
    protected function applyFilters(Builder $builder, ListQuery $query): void
    {
        foreach ($query->filters as $column => $value) {
            if (! in_array($column, $this->filterable, true)) {
                continue;
            }

            is_array($value)
                ? $builder->whereIn($column, $value)
                : $builder->where($column, $value);
        }
    }

    /**
     * @param  Builder<Model>  $builder
     */
    protected function applySort(Builder $builder, ListQuery $query): void
    {
        // An unrecognised sort column is ignored rather than passed through.
        $column = in_array($query->sort, $this->sortable, true)
            ? $query->sort
            : $this->defaultSort;

        $direction = $query->sort === $column ? $query->direction : $this->defaultDirection;

        $builder->orderBy($column, $direction);
    }

    public function find(int|string $id): ?Model
    {
        return $this->model->newQuery()->find($id);
    }

    public function findOrFail(int|string $id): Model
    {
        return $this->model->newQuery()->findOrFail($id);
    }

    public function create(array $attributes): Model
    {
        return $this->model->newQuery()->create($attributes);
    }

    public function update(Model $model, array $attributes): Model
    {
        $model->update($attributes);

        return $model;
    }

    public function delete(Model $model): bool
    {
        return (bool) $model->delete();
    }
}
