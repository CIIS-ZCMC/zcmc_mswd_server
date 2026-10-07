<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A Type of Assistance (Medicines, Hospital Bill, Laboratory / Diagnostics, …), used by
 * patient assistance records and guarantee breakdown lines. Audited: staff with
 * `library.manage` edit the list in the Library.
 */
class AssistantType extends Model
{
    use Auditable, SoftDeletes;

    /** Category vocabulary, value => label. Older rows may hold another value. */
    public const CATEGORIES = [
        'medical' => 'Medical',
        'food' => 'Food',
        'financial' => 'Financial',
        'burial' => 'Burial',
        'transportation' => 'Transportation',
        'others' => 'Others',
    ];

    protected $fillable = [
        'name',
        'code',
        'category',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function patientAssistances(): HasMany
    {
        return $this->hasMany(PatientAssistance::class, 'assistant_type_id');
    }

    /** Dropdown order: by name. */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('name');
    }

    /**
     * Select options (id => name) for a form: the active rows, plus the ids a record
     * already uses so a retired type stays visible on it.
     *
     * @param  list<int>  $keepIds
     * @return array<int, string>
     */
    public static function idOptions(array $keepIds = []): array
    {
        return static::withTrashed()
            ->where(fn (Builder $query) => $query
                ->where(fn (Builder $live) => $live->where('is_active', true)->whereNull('deleted_at'))
                ->when($keepIds !== [], fn (Builder $q) => $q->orWhereIn('id', $keepIds)))
            ->ordered()
            ->pluck('name', 'id')
            ->all();
    }

    /**
     * Category options for a form, keeping a record's older value that is not in the
     * vocabulary so editing it does not blank the field.
     *
     * @return array<string, string>
     */
    public static function categoryOptions(?string $keep = null): array
    {
        $options = self::CATEGORIES;

        if (filled($keep) && ! array_key_exists($keep, $options)) {
            $options[$keep] = ucfirst($keep);
        }

        return $options;
    }
}
