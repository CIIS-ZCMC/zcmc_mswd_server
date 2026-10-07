<?php

namespace App\Models;

use App\Models\Concerns\AssessmentCodeLookup;
use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A UIS §V fund source (MSWD, MAIP, PCSO, …). Assessments store the `code` in
 * `fund_source`, not a foreign key, so a renamed or deactivated source never breaks an
 * old record. Audited: staff with `library.manage` edit the list.
 */
class FundSource extends Model
{
    use AssessmentCodeLookup, Auditable, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'is_active',
        'sort_order',
    ];

    public static function assessmentColumn(): string
    {
        return 'fund_source';
    }

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
