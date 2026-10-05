<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * One dated "List of Expenses" record (ANNEX B section III) for a patient: house/lot
 * tenure (with the rent amount when rented), light and water sources, one amount per
 * expense item, and the family's income (patient + family members + other sources). The newest (recorded_on, id) is the patient's current record;
 * earlier ones are the history.
 *
 * Patient-level and independent of cases, assessments and the UIS — nothing here
 * references them. See docs/PATIENT_SOCIOECONOMIC_PLAN.md.
 */
class PatientSocioeconomicProfile extends Model
{
    use Auditable, SoftDeletes;

    /** The eight plain amount items, in form order. */
    public const EXPENSE_ITEMS = [
        'food', 'transport', 'medical', 'insurance', 'education', 'clothing', 'house_help', 'others',
    ];

    protected $fillable = [
        'patient_id',
        'recorded_on',
        'recorded_by',
        'house_tenure',
        'house_rent_amount',
        'light_source',
        'water_source',
        'food',
        'transport',
        'medical',
        'insurance',
        'education',
        'clothing',
        'house_help',
        'others',
        'others_specify',
        'patient_income',
        'income_members',
        'other_income_sources',
        'total_family_income',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'recorded_on' => 'date',
            'house_rent_amount' => 'decimal:2',
            'food' => 'decimal:2',
            'transport' => 'decimal:2',
            'medical' => 'decimal:2',
            'insurance' => 'decimal:2',
            'education' => 'decimal:2',
            'clothing' => 'decimal:2',
            'house_help' => 'decimal:2',
            'others' => 'decimal:2',
            'patient_income' => 'decimal:2',
            'total_family_income' => 'decimal:2',
            'income_members' => 'array',
            'other_income_sources' => 'array',
            'light_source' => 'array',
            'water_source' => 'array',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    /**
     * Total monthly expenses: the rent (only when the house is rented) plus the eight
     * amount items. Blank items count as zero.
     */
    public function total(): float
    {
        $total = $this->house_tenure === 'rented' ? (float) $this->house_rent_amount : 0.0;

        foreach (self::EXPENSE_ITEMS as $item) {
            $total += (float) $this->{$item};
        }

        return round($total, 2);
    }

    /** The "other family income" typed in the module, summed. */
    public function otherIncomeTotal(): float
    {
        return round(array_sum(array_map(
            fn ($source) => (float) ($source['amount'] ?? 0),
            $this->other_income_sources ?? [],
        )), 2);
    }

    /**
     * Total family income: the patient's income and the family members' incomes as they
     * were when the record was made, plus the other family income typed in the module.
     */
    public function incomeTotal(): float
    {
        $members = array_sum(array_map(
            fn ($member) => (float) ($member['monthly_income'] ?? 0),
            $this->income_members ?? [],
        ));

        return round((float) $this->patient_income + $members + $this->otherIncomeTotal(), 2);
    }

    /**
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        return ['patient_id' => $this->patient_id, 'case_id' => null];
    }
}
