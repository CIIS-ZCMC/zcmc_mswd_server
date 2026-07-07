<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Assessment extends Model
{
    protected $fillable = [
        'case_id',
        'created_by',
        'total_family_income',
        'housing_type',
        'utilities_access',
        'classification',
        'presenting_problem',
        'family_background',
        'social_functioning',
        'assessment_notes',
        'intervention_plan',
    ];

    protected function casts(): array
    {
        return [
            'total_family_income' => 'decimal:2',
        ];
    }

    public function case(): BelongsTo
    {
        return $this->belongsTo(CaseModel::class, 'case_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
