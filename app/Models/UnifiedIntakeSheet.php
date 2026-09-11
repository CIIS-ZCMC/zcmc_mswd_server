<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Models\Activity;

class UnifiedIntakeSheet extends Model
{
    use Auditable, SoftDeletes;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_FINALIZED = 'finalized';

    public const STATUS_CANCELLED = 'cancelled';

    /**
     * Case statuses an intake may be appended to instead of opening a new case.
     *
     * @var list<string>
     */
    public const ATTACHABLE_CASE_STATUSES = ['open', 'ongoing'];

    protected $fillable = [
        'intake_no',
        'patient_id',
        'case_id',
        'assessment_id',
        'intake_worker_id',
        'referral_source',
        'referral_details',
        'date_of_intake',
        'status',
        'submitted_at',
        'finalized_at',
        'finalized_by',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'date_of_intake' => 'datetime',
            'submitted_at' => 'datetime',
            'finalized_at' => 'datetime',
        ];
    }

    /**
     * Overrides {@see Auditable}: this model logs a curated field list under its
     * own `intake` log name rather than the trait's fillable/class-name defaults.
     * The trait is still used so the ownership stamping it carries applies here.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'intake_no', 'patient_id', 'case_id', 'assessment_id',
                'intake_worker_id', 'referral_source', 'referral_details',
                'date_of_intake', 'status', 'finalized_by', 'remarks',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('intake');
    }

    public function isFinalized(): bool
    {
        return $this->status === self::STATUS_FINALIZED;
    }

    public function isEditable(): bool
    {
        return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_SUBMITTED], true);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function case(): BelongsTo
    {
        return $this->belongsTo(CaseModel::class, 'case_id');
    }

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class);
    }

    public function intakeWorker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'intake_worker_id');
    }

    public function finalizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finalized_by');
    }

    /**
     * The sheet's own audit trail (status changes, field edits).
     */
    public function activities(): MorphMany
    {
        return $this->morphMany(Activity::class, 'subject');
    }

    /**
     * An intake carries both ids itself; either may still be null while the
     * sheet is a draft.
     *
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        return ['patient_id' => $this->patient_id, 'case_id' => $this->case_id];
    }
}
