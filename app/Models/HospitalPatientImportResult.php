<?php

namespace App\Models;

use App\Enums\HospitalPatientImportOutcome;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row of a HIS import batch: the outcome for a single requested HIS patient.
 */
class HospitalPatientImportResult extends Model
{
    protected $fillable = [
        'batch_id',
        'hospital_patient_id',
        'hospital_id',
        'outcome',
        'patient_id',
        'message',
    ];

    protected function casts(): array
    {
        return [
            'outcome' => HospitalPatientImportOutcome::class,
        ];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(HospitalPatientImportBatch::class, 'batch_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
