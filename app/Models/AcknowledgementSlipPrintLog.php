<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row per DOH-MAIFIP Acknowledgement Slip print. The slip is rendered on
 * demand from an MSWD guarantee or a HIS guarantor ledger entry; this table is
 * the history of who printed it, when, and for which source/encounter.
 *
 * Deliberately not Auditable: this table *is* the audit trail.
 */
class AcknowledgementSlipPrintLog extends Model
{
    protected $fillable = [
        'patient_guarantee_id',
        'his_guarantor_entry_id',
        'patient_id',
        'his_transaction_id',
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

    public function guarantee(): BelongsTo
    {
        return $this->belongsTo(PatientGuarantee::class, 'patient_guarantee_id');
    }

    public function printedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'printed_by');
    }
}
