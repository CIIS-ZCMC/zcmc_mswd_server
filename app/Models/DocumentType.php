<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A kind of patient document (Certificate of Indigency, Valid ID, …), picked on upload.
 * Documents store the id and a copy of the name, so a renamed or retired type still
 * reads correctly on old uploads. Audited: staff with `library.manage` edit the list.
 */
class DocumentType extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'name',
        'is_active',
        'sort_order',
    ];

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    /** Dropdown order: sort order, then name. */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
