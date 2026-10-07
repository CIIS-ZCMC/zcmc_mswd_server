<?php

namespace App\Models;

use App\Models\Concerns\AssessmentCodeLookup;
use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Who pays: a UIS §V fund source (MSWD, MAIP, PCSO, …) and the funds a guarantee's
 * breakdown lines name (City Mayor Assistance, City Council Assistance, …, absorbed from
 * the former Assistance Sources). Assessments store the `code` in `fund_source`;
 * breakdown lines store the id in `fund_source_id`. A source flagged `requires_specify`
 * ("Others") needs a line to say what it is. Audited: staff with `library.manage` edit
 * the list.
 */
class FundSource extends Model
{
    use AssessmentCodeLookup, Auditable, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'is_active',
        'sort_order',
        'requires_specify',
    ];

    public static function assessmentColumn(): string
    {
        return 'fund_source';
    }

    public static function guaranteeItemColumn(): ?string
    {
        return 'fund_source_id';
    }

    public function guaranteeItems(): HasMany
    {
        return $this->hasMany(PatientGuaranteeItem::class);
    }

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'requires_specify' => 'boolean',
        ];
    }
}
