<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Links a local case to a hospital (HIS) encounter (psPatRegisters), with a
 * curated snapshot of the encounter frozen at attach time. The HIS transaction
 * itself is never stored — it stays read-only on the sqlsrv connection; only
 * this MSWD-side link and its snapshot persist.
 */
class CaseHospitalTransaction extends Model
{
    use Auditable;

    protected $fillable = [
        'case_id',
        'his_transaction_id',
        'hospital_id',
        'snapshot',
        'linked_by',
        'linked_at',
    ];

    protected function casts(): array
    {
        return [
            'snapshot' => 'array',
            'linked_at' => 'datetime',
        ];
    }

    public function case(): BelongsTo
    {
        return $this->belongsTo(CaseModel::class, 'case_id');
    }

    public function linkedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'linked_by');
    }

    /**
     * Attributed to the case (and its patient), reached through the soft-deletable
     * parent so a link on an archived case is still attributable.
     *
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        $case = $this->auditParent('case');

        return ['patient_id' => $case?->patient_id, 'case_id' => $this->case_id];
    }
}
