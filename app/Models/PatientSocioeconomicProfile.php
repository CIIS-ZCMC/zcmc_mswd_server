<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * One dated "List of Expenses" record (ANNEX B section III) for a patient: house/lot
 * tenure (with the rent amount when rented), light and water sources, and one amount
 * per expense item. The newest (recorded_on, id) is the patient's current record;
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

    /**
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        return ['patient_id' => $this->patient_id, 'case_id' => null];
    }
}
