<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Activity;

class Patient extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'sector_id',
        'hospital_id',
        'mswd_id',
        'first_name',
        'last_name',
        'middle_name',
        'extension_name',
        'birthdate',
        'estimated_age',
        'is_incapacitated',
        'sex',
        'civil_status',
        'address',
        'barangay',
        'municipality',
        'province',
        'contact_number',
        'religion',
        'nationality',
        'place_of_birth',
        'permanent_address',
        'present_address',
        'educational_attainment',
        'occupation',
        'employer',
        'monthly_income',
    ];

    protected function casts(): array
    {
        return [
            'birthdate' => 'date',
            'is_incapacitated' => 'boolean',
            'monthly_income' => 'decimal:2',
        ];
    }

    public function sector(): BelongsTo
    {
        return $this->belongsTo(Sector::class);
    }

    public function patientIds(): HasMany
    {
        return $this->hasMany(PatientId::class);
    }

    public function watchers(): HasMany
    {
        return $this->hasMany(PatientWatcher::class);
    }

    public function familyMembers(): HasMany
    {
        return $this->hasMany(PatientFamilyMember::class);
    }

    public function caretakers(): HasMany
    {
        return $this->hasMany(PatientCaretaker::class);
    }

    public function cases(): HasMany
    {
        return $this->hasMany(CaseModel::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    /**
     * The patient's most recently opened case (by date_opened, then id to
     * break ties). Excludes soft-deleted cases via CaseModel's own scope.
     */
    public function latestCase(): HasOne
    {
        return $this->hasOne(CaseModel::class)->latestOfMany(['date_opened', 'id']);
    }

    /**
     * The patient's most recently created assessment across all their cases.
     * Assessments belonging to a soft-deleted case are excluded automatically
     * — HasOneThrough joins the cases table and filters its deleted_at.
     */
    public function latestAssessment(): HasOneThrough
    {
        return $this->hasManyThrough(Assessment::class, CaseModel::class, 'patient_id', 'case_id')
            ->one()->latestOfMany();
    }

    /**
     * The patient's own audit trail (demographic changes).
     */
    public function activities(): MorphMany
    {
        return $this->morphMany(Activity::class, 'subject');
    }
}
