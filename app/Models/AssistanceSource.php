<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Where part of a guarantee's money comes from (City Mayor Assistance, City Council
 * Assistance, …). A source flagged `requires_specify` ("Others") needs a line to say
 * what it is.
 */
class AssistanceSource extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'requires_specify',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'requires_specify' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function guaranteeItems(): HasMany
    {
        return $this->hasMany(PatientGuaranteeItem::class);
    }
}
