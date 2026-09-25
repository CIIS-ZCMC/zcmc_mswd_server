<?php

namespace App\Models;

use App\Enums\CardColor;
use App\Models\Bizbox\PatientTransaction;
use App\Models\Concerns\Auditable;
use App\Services\PatientTransactionService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\QueryException;
use Spatie\Activitylog\Models\Activity;

class CaseModel extends Model
{
    use Auditable, SoftDeletes;

    public const STATUS_OPEN = 'open';

    public const STATUS_ONGOING = 'ongoing';

    public const STATUS_CLOSED = 'closed';

    public const STATUS_REFERRED = 'referred';

    /**
     * Statuses from which a case may be archived (soft-deleted).
     *
     * @var list<string>
     */
    public const ARCHIVABLE_STATUSES = [self::STATUS_CLOSED, self::STATUS_REFERRED];

    protected $table = 'cases';

    protected $fillable = [
        'patient_id',
        'assigned_user_id',
        'created_by',
        'case_code',
        'case_type',
        'is_protective',
        'priority_level',
        'status',
        'admission_type',
        'transaction_id',
        'transaction_type',
        'card_color',
        'date_opened',
        'date_closed',
        'watcher_waiver_reason',
        'watcher_waiver_note',
        'watcher_waived_by',
        'watcher_waived_at',
        'watcher_legacy_exempt',
    ];

    protected function casts(): array
    {
        return [
            'date_opened' => 'datetime',
            'date_closed' => 'datetime',
            'watcher_waived_at' => 'datetime',
            'watcher_legacy_exempt' => 'boolean',
            'is_protective' => 'boolean',
            'card_color' => CardColor::class,
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    /**
     * The worker who opened the case. Set once at open and never rewritten on
     * reassignment — distinct from assignedUser(), the current handler.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * The live HIS encounter this case was opened for, or null when the case has
     * no transaction_id or the HIS cannot be reached. Not an Eloquent relation:
     * the encounter lives on the read-only `sqlsrv` connection, so it is resolved
     * on demand rather than joined.
     */
    public function hisTransaction(): ?PatientTransaction
    {
        if (blank($this->transaction_id)) {
            return null;
        }

        try {
            return app(PatientTransactionService::class)->find($this->transaction_id);
        } catch (ModelNotFoundException|QueryException $e) {
            report($e);

            return null;
        }
    }

    /**
     * The section head who filed the watcher waiver (if any).
     */
    public function waivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'watcher_waived_by');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(CaseActivity::class, 'case_id');
    }

    public function diagnostics(): HasMany
    {
        return $this->hasMany(Diagnostic::class, 'case_id');
    }

    public function hospitalTransactions(): HasMany
    {
        return $this->hasMany(CaseHospitalTransaction::class, 'case_id');
    }

    public function assessments(): HasMany
    {
        return $this->hasMany(Assessment::class, 'case_id');
    }

    /**
     * The case's Social Case Study Report — at most one, guaranteed by the
     * uniq_case_social_case database index, not by this relation.
     */
    public function socialCase(): HasOne
    {
        return $this->hasOne(Assessment::class, 'case_id')->whereNotNull('social_case_status');
    }

    public function interventions(): HasMany
    {
        return $this->hasMany(Intervention::class, 'case_id');
    }

    public function progressNotes(): HasMany
    {
        return $this->hasMany(CaseProgressNote::class, 'case_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class, 'case_id');
    }

    public function patientAssistances(): HasMany
    {
        return $this->hasMany(PatientAssistance::class, 'case_id');
    }

    public function watchers(): HasMany
    {
        return $this->hasMany(CaseWatcher::class, 'case_id');
    }

    /**
     * Automatic field-level audit trail (from the Auditable trait). Distinct
     * from activities(), which is the CaseActivity milestone timeline.
     */
    public function auditLogs(): MorphMany
    {
        return $this->morphMany(Activity::class, 'subject');
    }

    public function isArchivable(): bool
    {
        return in_array($this->status, self::ARCHIVABLE_STATUSES, true);
    }

    /**
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        return ['patient_id' => $this->patient_id, 'case_id' => $this->id];
    }
}
