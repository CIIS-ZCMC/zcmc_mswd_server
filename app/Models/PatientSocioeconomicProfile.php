<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * One dated snapshot of a patient's socio-economic standing: household income,
 * living conditions and the list of expenses. The newest (recorded_on, id) is the
 * patient's current profile; earlier ones are the history.
 *
 * Patient-level and independent of cases, assessments and the UIS — nothing here
 * references them. See docs/PATIENT_SOCIOECONOMIC_PLAN.md.
 */
class PatientSocioeconomicProfile extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'patient_id',
        'recorded_on',
        'recorded_by',
        'total_family_income',
        'other_income_sources',
        'house_tenure',
        'housing_type',
        'light_source',
        'water_source',
        'utilities_access',
        'remarks',
        'household_size',
        'net_per_capita_income',
    ];

    protected function casts(): array
    {
        return [
            'recorded_on' => 'date',
            'total_family_income' => 'decimal:2',
            'net_per_capita_income' => 'decimal:2',
            'other_income_sources' => 'array',
            'light_source' => 'array',
            'water_source' => 'array',
            'household_size' => 'integer',
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

    public function expenses(): HasMany
    {
        return $this->hasMany(PatientSocioeconomicExpense::class, 'profile_id');
    }

    /**
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        return ['patient_id' => $this->patient_id, 'case_id' => null];
    }
}
