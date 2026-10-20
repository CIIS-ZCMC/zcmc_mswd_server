<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One MSWD visit for a patient's HIS encounter, timed for turnaround: arrival
 * (time in), start of service and completion. An encounter has at most one open
 * visit at a time. Audited against the patient. See docs/TURNAROUND_TIME_PLAN.md.
 */
class ServiceVisit extends Model
{
    use Auditable;

    public const STATUS_WAITING = 'waiting';

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    /** Statuses still on the queue board. */
    public const OPEN_STATUSES = [self::STATUS_WAITING, self::STATUS_IN_PROGRESS];

    protected $fillable = [
        'patient_id',
        'his_transaction_id',
        'status',
        'purpose',
        'remarks',
        'arrived_at',
        'started_at',
        'completed_at',
        'cancelled_at',
        'cancel_reason',
        'received_by',
        'served_by',
        'completed_by',
        'cancelled_by',
    ];

    protected function casts(): array
    {
        return [
            'his_transaction_id' => 'integer',
            'arrived_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function servedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'served_by');
    }

    public function completedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function scopeOpen(Builder $query): void
    {
        $query->whereIn('status', self::OPEN_STATUSES);
    }

    public function scopeForEncounter(Builder $query, int $patientId, int $transactionId): void
    {
        $query->where('patient_id', $patientId)->where('his_transaction_id', $transactionId);
    }

    /**
     * The encounter's latest visit whose service started and was not cancelled:
     * its start and completion are the "Time Started / Ended" printed on the slips.
     */
    public static function lastServedFor(int $patientId, int $transactionId): ?self
    {
        return self::query()
            ->forEncounter($patientId, $transactionId)
            ->where('status', '!=', self::STATUS_CANCELLED)
            ->whereNotNull('started_at')
            ->orderByDesc('arrived_at')
            ->orderByDesc('id')
            ->first();
    }

    public function isOpen(): bool
    {
        return in_array($this->status, self::OPEN_STATUSES, true);
    }

    /** Arrival to start of service; still counting while the patient waits. */
    public function waitingMinutes(): ?int
    {
        if ($this->status === self::STATUS_CANCELLED && $this->started_at === null) {
            return null;
        }

        return self::minutesBetween($this->arrived_at, $this->started_at);
    }

    /** Start of service to completion; null until service starts. */
    public function processingMinutes(): ?int
    {
        if ($this->started_at === null || ($this->status === self::STATUS_CANCELLED && $this->completed_at === null)) {
            return null;
        }

        return self::minutesBetween($this->started_at, $this->completed_at);
    }

    /** Arrival to completion: the turnaround time. Still counting while open. */
    public function totalMinutes(): ?int
    {
        if ($this->status === self::STATUS_CANCELLED) {
            return null;
        }

        return self::minutesBetween($this->arrived_at, $this->completed_at);
    }

    /**
     * Whether the duration of the given stage is within the configured target.
     * Returns null when the visit is cancelled, the stage duration is null,
     * or the target is inactive/missing.
     *
     * @param  array<string, int>|null  $activeTargets
     */
    public function isWithinTarget(string $stage, ?array $activeTargets = null): ?bool
    {
        if ($this->status === self::STATUS_CANCELLED) {
            return null;
        }

        $activeTargets ??= TurnaroundTarget::activeMinutes();

        if (! array_key_exists($stage, $activeTargets)) {
            return null;
        }

        $minutes = match ($stage) {
            TurnaroundTarget::STAGE_WAITING => $this->waitingMinutes(),
            TurnaroundTarget::STAGE_PROCESSING => $this->processingMinutes(),
            TurnaroundTarget::STAGE_TOTAL => $this->totalMinutes(),
            default => null,
        };

        if ($minutes === null) {
            return null;
        }

        return $minutes <= $activeTargets[$stage];
    }

    /** Whole minutes from $from to $to (or to now while the stage is open). */
    private static function minutesBetween(?Carbon $from, ?Carbon $to): ?int
    {
        if ($from === null) {
            return null;
        }

        return max(0, (int) $from->diffInMinutes($to ?? now()));
    }

    /**
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        return ['patient_id' => $this->patient_id, 'case_id' => null];
    }
}
