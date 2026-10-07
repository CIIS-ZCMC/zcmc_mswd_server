<?php

namespace App\Models\Concerns;

use App\Models\Assessment;
use Illuminate\Database\Eloquent\Builder;

/**
 * A Library list whose `code` assessments store as a plain string (no foreign key) in
 * the column named by assessmentColumn(). Gives the list its dropdown order and a
 * usage count, and resolves a stored code back to its name.
 */
trait AssessmentCodeLookup
{
    /** The assessments column that stores this list's code. */
    abstract public static function assessmentColumn(): string;

    /** Dropdown order: sort order, then name. */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    /** Adds `usage_count`: how many assessments store this row's code. */
    public function scopeWithUsageCount(Builder $query): Builder
    {
        $table = $this->getTable();

        return $query
            ->select("{$table}.*")
            ->selectSub(
                Assessment::query()
                    ->selectRaw('count(*)')
                    ->whereColumn(static::assessmentColumn(), "{$table}.code"),
                'usage_count',
            );
    }

    /**
     * Select options (code => name) for a form: the active rows, plus `$keep` (the value
     * the record already stores) so a retired option stays visible on the records using it.
     *
     * @return array<string, string>
     */
    public static function options(?string $keep = null): array
    {
        return static::withTrashed()
            ->where(fn (Builder $query) => $query
                ->where(fn (Builder $live) => $live->where('is_active', true)->whereNull('deleted_at'))
                ->when($keep, fn (Builder $q) => $q->orWhere('code', $keep)))
            ->ordered()
            ->pluck('name', 'code')
            ->all();
    }

    /** How many assessments store this row's code. */
    public function usageCount(): int
    {
        return Assessment::query()->where(static::assessmentColumn(), $this->code)->count();
    }

    /**
     * The name for a stored code, including retired and deleted rows so old records
     * still print. Unknown codes come back unchanged; null stays null.
     */
    public static function labelFor(?string $code): ?string
    {
        if ($code === null || $code === '') {
            return $code;
        }

        return static::withTrashed()->where('code', $code)->value('name') ?? $code;
    }
}
