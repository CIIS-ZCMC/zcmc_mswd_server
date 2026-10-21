<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Validation\ValidationException;

/**
 * An assessment is two things, distinguished by `social_case_status`:
 * NULL is the ordinary intake-time socioeconomic snapshot, non-NULL means this
 * row *is* its case's Social Case Study Report. See docs/SOCIAL_CASE_PLAN.md §A.0.
 *
 * The intake (the UIS) belongs to a patient and a HIS encounter and only
 * optionally to a case: it can be taken before any case is opened, and a case
 * opened later on that encounter picks it up. See docs/INTAKE_ASSESSMENT_PLAN.md.
 */
class Assessment extends Model
{
    use Auditable, SoftDeletes;

    public const SOCIAL_CASE_DRAFT = 'draft';

    public const SOCIAL_CASE_FOR_REVIEW = 'for_review';

    public const SOCIAL_CASE_FINALIZED = 'finalized';

    /**
     * Lifecycle states in which the narrative may still be rewritten.
     *
     * @var list<string>
     */
    public const SOCIAL_CASE_EDITABLE_STATUSES = [self::SOCIAL_CASE_DRAFT, self::SOCIAL_CASE_FOR_REVIEW];

    /**
     * The only columns an amend may rewrite on a finalized row — everything
     * else is frozen until the document is reopened. `social_case_guard` is
     * database-generated and deliberately absent from $fillable.
     *
     * @var list<string>
     */
    private const UNLOCKED_ON_FINALIZED = [
        'social_case_status', 'revision', 'noted_by', 'noted_at',
        'review_requested_at', 'deleted_at', 'updated_at',
    ];

    protected $fillable = [
        'patient_id',
        'his_transaction_id',
        'transaction_type',
        'encounter_date',
        'uis_snapshot',
        'uis_snapshot_at',
        'uis_snapshot_by',
        'interviewed_at',
        'interviewed_by',
        'case_id',
        'parent_assessment_id',
        'reassessment_reason',
        'created_by',
        'prepared_by',
        'prepared_at',
        'noted_by',
        'noted_at',
        'review_requested_at',
        'social_case_status',
        'social_case_no',
        'revision',
        'total_family_income',
        'net_per_capita_income',
        'household_size',
        'housing_type',
        'utilities_access',
        'classification',
        'calculated_classification',
        'classification_override_reason',
        'calculated_discount_rate',
        'informant_name',
        'informant_last_name',
        'informant_first_name',
        'informant_middle_name',
        'informant_relationship',
        'informant_address',
        'informant_contact_number',
        'other_income_sources',
        'referral_source',
        'reason_for_referral',
        'presenting_problem',
        'problem_categories',
        'problem_specify',
        'house_tenure',
        'light_source',
        'water_source',
        'family_background',
        'medical_history',
        'social_functioning',
        'assessment_notes',
        'recommendation',
        'recommended_assistance',
        'recommended_amount',
        'recommendation_mode',
        'fund_source',
        'intervention_plan',
    ];

    /**
     * The frozen UIS copy is a blob: logging its old → new pair on every refresh
     * would swamp the trail and tell a reader nothing. `uis_snapshot_at` and
     * `uis_snapshot_by` are logged and say who refreshed it, and when.
     *
     * @return list<string>
     */
    public function auditExcept(): array
    {
        return ['uis_snapshot'];
    }

    /** UIS form III/IV checkbox vocabularies (validated in the requests, printed by the UIS PDF). */
    public const HOUSE_TENURES = ['owned', 'rented'];

    public const LIGHT_SOURCES = ['electricity', 'kerosene', 'candle'];

    public const WATER_SOURCES = ['owned', 'public', 'artesian_well'];

    public const PROBLEM_CATEGORIES = ['health', 'economic', 'housing', 'food_nutrition', 'employment', 'other'];

    protected function casts(): array
    {
        return [
            'total_family_income' => 'decimal:2',
            'net_per_capita_income' => 'decimal:2',
            'calculated_discount_rate' => 'decimal:2',
            'recommended_amount' => 'decimal:2',
            'revision' => 'integer',
            'household_size' => 'integer',
            'uis_snapshot' => 'array',
            'uis_snapshot_at' => 'datetime',
            'interviewed_at' => 'datetime',
            'problem_categories' => 'array',
            'light_source' => 'array',
            'water_source' => 'array',
            'other_income_sources' => 'array',
            'prepared_at' => 'datetime',
            'noted_at' => 'datetime',
            'review_requested_at' => 'datetime',
            'encounter_date' => 'datetime',
            'his_transaction_id' => 'integer',
        ];
    }

    /**
     * A finalized SCSR is a signed document. The lock lives on the model rather
     * than in SocialCaseService because PUT /assessments/{assessment} and
     * Filament's relation manager both write the row directly — a service-only
     * guard would have two holes.
     */
    protected static function booted(): void
    {
        // An assessment written through a case (the case page, Filament, the
        // SCSR) takes its patient and encounter from that case.
        static::creating(function (Assessment $assessment) {
            if ($assessment->case_id === null) {
                return;
            }

            $case = CaseModel::withTrashed()->find($assessment->case_id);
            $assessment->patient_id ??= $case?->patient_id;
            $assessment->his_transaction_id ??= $case?->transaction_id;
            $assessment->transaction_type ??= $case?->transaction_type;
        });

        static::updating(function (Assessment $assessment) {
            if ($assessment->getOriginal('social_case_status') !== self::SOCIAL_CASE_FINALIZED) {
                return;
            }

            if (array_diff(array_keys($assessment->getDirty()), self::UNLOCKED_ON_FINALIZED) !== []) {
                throw ValidationException::withMessages([
                    'social_case_status' => 'A finalized social case study must be amended before it can be edited.',
                ]);
            }
        });
    }

    public function case(): BelongsTo
    {
        return $this->belongsTo(CaseModel::class, 'case_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    /**
     * The intake-time assessments (not the SCSR) of one patient's encounter,
     * newest first; the first is the one the UIS prints.
     */
    public function scopeIntakeFor(Builder $query, int $patientId, int|string|null $transactionId): Builder
    {
        return $query->where('patient_id', $patientId)
            ->where('his_transaction_id', $transactionId)
            ->whereNull('social_case_status')
            ->latest()
            ->latest('id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function preparedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prepared_by');
    }

    public function notedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'noted_by');
    }

    /** The worker who conducted the intake interview; "Interviewed by" on the UIS. */
    public function interviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'interviewed_by');
    }

    /** Who last refreshed the frozen UIS copy. */
    public function uisSnapshotBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uis_snapshot_by');
    }

    public function parentAssessment(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_assessment_id');
    }

    public function reassessments(): HasMany
    {
        return $this->hasMany(self::class, 'parent_assessment_id');
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(AssessmentExpense::class);
    }

    public function isReassessment(): bool
    {
        return $this->parent_assessment_id !== null;
    }

    public function hasOverride(): bool
    {
        return $this->classification_override_reason !== null
            || ($this->classification !== null && $this->classification !== $this->calculated_classification);
    }

    /**
     * The most recent archived copy of this report. Documents hang off the
     * case, not the assessment, so this reaches them by case_id and narrows to
     * the SCSR document type — earlier revisions stay listed under
     * GET /cases/{case}/documents.
     */
    public function latestSocialCaseDocument(): HasOne
    {
        return $this->hasOne(Document::class, 'case_id', 'case_id')
            ->where('document_type', 'social_case_study')
            ->latestOfMany();
    }

    public function isSocialCase(): bool
    {
        return $this->social_case_status !== null;
    }

    public function isSocialCaseEditable(): bool
    {
        return in_array($this->social_case_status, self::SOCIAL_CASE_EDITABLE_STATUSES, true);
    }

    /**
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        return ['patient_id' => $this->patient_id ?? $this->auditParent('case')?->patient_id, 'case_id' => $this->case_id];
    }
}
