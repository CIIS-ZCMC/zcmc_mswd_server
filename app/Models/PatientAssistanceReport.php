<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientAssistanceReport extends Model
{
    use Auditable;

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

    /**
     * Two hops, through the assistance record this disbursement reports on.
     *
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        $case = $this->auditParent('assistance')?->auditParent('case');

        return ['patient_id' => $case?->patient_id, 'case_id' => $case?->id];
    }
}
