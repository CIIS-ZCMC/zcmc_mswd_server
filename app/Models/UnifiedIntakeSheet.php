<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class UnifiedIntakeSheet extends Model
{
    use LogsActivity, SoftDeletes;

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
}
