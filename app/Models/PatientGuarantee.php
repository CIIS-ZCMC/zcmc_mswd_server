<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * One guarantor (MAIFIP, PCSO, …) standing for a patient on one hospital (HIS)
 * encounter, with the breakdown of where its money comes from. The total is the sum
 * of the breakdown lines; it is never stored.
 *
 * Not the HIS guarantor ledger (App\Models\Bizbox\PatientGuarantors) — this is the
 * MSWD's own record. See docs/PATIENT_GUARANTOR_PLAN.md.
 */
class PatientGuarantee extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'patient_id',
        'his_transaction_id',
        'hospital_id',
        'guarantor_id',
        'reference_no',
        'guaranteed_on',
        'remarks',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'his_transaction_id' => 'integer',
            'hospital_id' => 'integer',
            'guaranteed_on' => 'date',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function guarantor(): BelongsTo
    {
        return $this->belongsTo(Guarantor::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PatientGuaranteeItem::class)->orderBy('id');
    }

    /** The guarantee's amount: its breakdown lines, summed. */
    public function total(): float
    {
        if ($this->items_sum_amount !== null) {
            return round((float) $this->items_sum_amount, 2);
        }

        return round((float) $this->items->sum('amount'), 2);
    }

    /**
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        return ['patient_id' => $this->patient_id, 'case_id' => null];
    }
}
