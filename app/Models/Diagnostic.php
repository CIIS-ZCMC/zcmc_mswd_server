<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Diagnostic extends Model
{
    protected $fillable = [
        'case_id',
        'created_by',
        'diagnosis_name',
        'diagnosis_description',
        'diagnosis_date',
        'attending_physician',
        'facility_name',
    ];

    protected function casts(): array
    {
        return [
            'diagnosis_date' => 'datetime',
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

    public function reports(): HasMany
    {
        return $this->hasMany(DiagnosticReport::class, 'diagnostic_id');
    }
}
