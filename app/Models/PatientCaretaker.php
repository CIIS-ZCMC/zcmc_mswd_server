<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PatientCaretaker extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'patient_id',
        'user_id',
        'role',
        'assigned_date',
        'unassigned_date',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'assigned_date' => 'datetime',
            'unassigned_date' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
