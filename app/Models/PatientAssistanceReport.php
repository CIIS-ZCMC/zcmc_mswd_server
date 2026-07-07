<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientAssistanceReport extends Model
{
    protected $fillable = [
        'assistance_id',
        'hospital_id',
        'mswd_id',
        'patient_name',
        'patient_address',
        'assistant_type',
        'category',
        'amount',
        'snapshot_json',
        'released_by',
        'released_at',
        'is_void',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'snapshot_json' => 'array',
            'released_at' => 'datetime',
            'is_void' => 'boolean',
        ];
    }

    public function assistance(): BelongsTo
    {
        return $this->belongsTo(PatientAssistance::class, 'assistance_id');
    }

    public function releasedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'released_by');
    }
}
