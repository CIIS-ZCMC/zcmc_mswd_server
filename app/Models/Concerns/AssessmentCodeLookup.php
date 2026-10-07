<?php

namespace App\Models\Concerns;

use App\Models\Assessment;
use App\Models\PatientGuaranteeItem;
use Illuminate\Database\Eloquent\Builder;

/**
 * A Library list whose `code` assessments store as a plain string (no foreign key) in
 * the column named by assessmentColumn(). Guarantee breakdown lines may also point at
 * a row by id, through guaranteeItemColumn(). Gives the list its dropdown order and
 * usage counts, and resolves a stored code back to its name.
 */
trait AssessmentCodeLookup
{
    /** The assessments column that stores this list's code. */
    abstract public static function assessmentColumn(): string;

    /** The patient_guarantee_items column that stores this list's id, if any. */
    public static function guaranteeItemColumn(): ?string
    {
        return null;
    }

    /** Dropdown order: sort order, then name. */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    /**
     * Adds `assessments_usage` (assessments storing this row's code) and
     * `guarantee_lines_usage` (breakdown lines pointing at it); `usage_count` is their sum.
     */
    public function scopeWithUsageCount(Builder $query): Builder
    {
        $table = $this->getTable();
        $itemColumn = static::guaranteeItemColumn();

        $query->select("{$table}.*")
            ->selectSub(
                Assessment::query()
                    ->selectRaw('count(*)')
                    ->whereColumn(static::assessmentColumn(), "{$table}.code"),
                'assessments_usage',
            );

        return $itemColumn === null
            ? $query->selectRaw('0 as guarantee_lines_usage')
            : $query->selectSub(
                PatientGuaranteeItem::query()
                    ->selectRaw('count(*)')
                    ->whereColumn($itemColumn, "{$table}.id"),
                'guarantee_lines_usage',
            );
    }

    /** Assessments plus breakdown lines, when selected withUsageCount(); null otherwise. */
    public function getUsageCountAttribute(): ?int
    {
        if (! array_key_exists('assessments_usage', $this->attributes)) {
            return null;
        }

        return (int) $this->attributes['assessments_usage'] + (int) ($this->attributes['guarantee_lines_usage'] ?? 0);
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

    /**
     * How many assessments store this row's code. This alone locks the code: breakdown
     * lines store the id, so a code change never orphans them.
     */
    public function assessmentUsageCount(): int
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
