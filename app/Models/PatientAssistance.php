<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Activity;

class PatientAssistance extends Model
{
    use Auditable, SoftDeletes;

    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_RELEASED = 'released';

    public const STATUS_CANCELLED = 'cancelled';

    /**
     * Statuses from which the aid may still be cancelled.
     *
     * @var list<string>
     */
    public const CANCELLABLE_STATUSES = [self::STATUS_PENDING, self::STATUS_APPROVED];

    protected $table = 'patient_assistance';

    protected $fillable = [
        'case_id',
        'assistant_type_id',
        'guarantor_id',
        'amount',
        'notes',
        'date_given',
        'created_by',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'date_given' => 'datetime',
        ];
    }

    public function case(): BelongsTo
    {
        return $this->belongsTo(CaseModel::class, 'case_id');
    }

    public function assistantType(): BelongsTo
    {
        return $this->belongsTo(AssistantType::class);
    }

    public function guarantor(): BelongsTo
    {
        return $this->belongsTo(Guarantor::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(PatientAssistanceLog::class, 'assistance_id');
    }

    public function reports(): HasMany
    {
        return $this->hasMany(PatientAssistanceReport::class, 'assistance_id');
    }

    /**
     * Automatic field-level audit trail (from the Auditable trait). Distinct
     * from logs(), the human status-transition timeline.
     */
    public function auditLogs(): MorphMany
    {
        return $this->morphMany(Activity::class, 'subject');
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isReleased(): bool
    {
        return $this->status === self::STATUS_RELEASED;
    }

    /**
     * An aid may only be edited while it is still pending approval.
     */
    public function isEditable(): bool
    {
        return $this->isPending();
    }

    public function isCancellable(): bool
    {
        return in_array($this->status, self::CANCELLABLE_STATUSES, true);
    }
}
