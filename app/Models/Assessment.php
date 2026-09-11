<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
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
        'case_id',
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
        'housing_type',
        'utilities_access',
        'classification',
        'referral_source',
        'reason_for_referral',
        'presenting_problem',
        'family_background',
        'medical_history',
        'social_functioning',
        'assessment_notes',
        'recommendation',
        'recommended_assistance',
        'recommended_amount',
        'intervention_plan',
    ];

    protected function casts(): array
    {
        return [
            'total_family_income' => 'decimal:2',
            'recommended_amount' => 'decimal:2',
            'revision' => 'integer',
            'prepared_at' => 'datetime',
            'noted_at' => 'datetime',
            'review_requested_at' => 'datetime',
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

    public function expenses(): HasMany
    {
        return $this->hasMany(AssessmentExpense::class);
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
        $case = $this->auditParent('case');

        return ['patient_id' => $case?->patient_id, 'case_id' => $this->case_id];
    }
}
