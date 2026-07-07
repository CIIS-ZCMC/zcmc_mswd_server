<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientId extends Model
{
    protected $fillable = [
        'patient_id',
        'id_type',
        'id_number',
        'date_issued',
        'date_expiry',
        'is_verified',
    ];

    protected function casts(): array
    {
        return [
            'date_issued' => 'date',
            'date_expiry' => 'date',
            'is_verified' => 'boolean',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
