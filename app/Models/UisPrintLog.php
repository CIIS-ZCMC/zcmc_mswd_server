<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row per Unified Intake Sheet (ANNEX B) print. The UIS itself is not a
 * stored record — it is rendered on demand from a case; this table is the
 * history of who printed it, when, and for which case/encounter.
 *
 * Deliberately not Auditable: this table *is* the audit trail.
 */
class UisPrintLog extends Model
{
    protected $fillable = [
        'case_id',
        'patient_id',
        'transaction_id',
        'printed_by',
        'printed_at',
        'copies',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'printed_at' => 'datetime',
            'copies' => 'integer',
        ];
    }

    public function case(): BelongsTo
    {
        return $this->belongsTo(CaseModel::class, 'case_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function printedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'printed_by');
    }
}
