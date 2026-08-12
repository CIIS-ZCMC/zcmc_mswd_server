<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientMerge extends Model
{
    protected $fillable = [
        'source_patient_id',
        'target_patient_id',
        'manifest',
        'performed_by',
        'reversed_at',
        'reversed_by',
    ];

    protected function casts(): array
    {
        return [
            'manifest' => 'array',
            'reversed_at' => 'datetime',
        ];
    }

    public function isReversed(): bool
    {
        return $this->reversed_at !== null;
    }

    public function source(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'source_patient_id');
    }

    public function target(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'target_patient_id');
    }
}
