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

    public const APPROVAL_NOT_REQUIRED = 'not_required';

    public const APPROVAL_PENDING = 'pending';

    public const APPROVAL_APPROVED = 'approved';

    protected $fillable = [
        'patient_id',
        'his_transaction_id',
        'hospital_id',
        'guarantor_id',
        'reference_no',
        'guaranteed_on',
        'remarks',
        'recorded_by',
        'approval_status',
        'approved_by',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'his_transaction_id' => 'integer',
            'hospital_id' => 'integer',
            'guaranteed_on' => 'date',
            'approved_at' => 'datetime',
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

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function isPendingApproval(): bool
    {
        return $this->approval_status === self::APPROVAL_PENDING;
    }

    /** Whether any guarantee on this HIS encounter still waits for sign-off. */
    public static function hasPendingForEncounter(int|string $hisTransactionId): bool
    {
        return static::query()
            ->where('his_transaction_id', $hisTransactionId)
            ->where('approval_status', self::APPROVAL_PENDING)
            ->exists();
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
