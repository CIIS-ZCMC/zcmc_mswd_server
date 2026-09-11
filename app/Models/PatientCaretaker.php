<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PatientCaretaker extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'patient_id',
        'user_id',
        'role',
        'assigned_date',
        'unassigned_date',
        'is_active',
        'assigned_by',
        'unassigned_by',
        'reason',
        'unassigned_reason',
        'replaced_by_id',
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

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function unassignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'unassigned_by');
    }

    /**
     * The assignment that superseded this one, set when a handover is recorded.
     */
    public function replacedBy(): BelongsTo
    {
        return $this->belongsTo(self::class, 'replaced_by_id');
    }

    /**
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        return ['patient_id' => $this->patient_id, 'case_id' => null];
    }
}
