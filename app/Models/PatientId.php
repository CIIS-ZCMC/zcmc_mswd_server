<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientId extends Model
{
    use Auditable;

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

    /**
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        return ['patient_id' => $this->patient_id, 'case_id' => null];
    }
}
