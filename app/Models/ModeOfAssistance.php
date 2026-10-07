<?php

namespace App\Models;

use App\Models\Concerns\AssessmentCodeLookup;
use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A UIS §V mode of assistance (Financial Assistance, Counseling, …). Assessments store
 * the `code` in `recommendation_mode`, not a foreign key, so a renamed or deactivated
 * mode never breaks an old record. Audited: staff with `library.manage` edit the list.
 */
class ModeOfAssistance extends Model
{
    use AssessmentCodeLookup, Auditable, SoftDeletes;

    protected $table = 'mode_of_assistances';

    protected $fillable = [
        'name',
        'code',
        'is_active',
        'sort_order',
    ];

    public static function assessmentColumn(): string
    {
        return 'recommendation_mode';
    }

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
