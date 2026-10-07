<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A UIS §V mode of assistance (Financial Assistance, Counseling, …). Assessments store
 * the `code` in `recommendation_mode`, not a foreign key, so a renamed or deactivated
 * mode never breaks an old record. Audited: staff with `library.manage` edit the list.
 */
class ModeOfAssistance extends Model
{
    use Auditable, SoftDeletes;

    protected $table = 'mode_of_assistances';

    protected $fillable = [
        'name',
        'code',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /** Dropdown order: sort order, then name. */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }
}
