<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
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
        'case_code',
        'case_type',
        'priority_level',
        'status',
        'admission_type',
        'date_opened',
        'date_closed',
    ];

    protected function casts(): array
    {
        return [
            'date_opened' => 'datetime',
            'date_closed' => 'datetime',
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

    public function activities(): HasMany
    {
        return $this->hasMany(CaseActivity::class, 'case_id');
    }

    public function diagnostics(): HasMany
    {
        return $this->hasMany(Diagnostic::class, 'case_id');
    }

    public function assessments(): HasMany
    {
        return $this->hasMany(Assessment::class, 'case_id');
    }

    public function interventions(): HasMany
    {
        return $this->hasMany(Intervention::class, 'case_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class, 'case_id');
    }

    public function patientAssistances(): HasMany
    {
        return $this->hasMany(PatientAssistance::class, 'case_id');
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
}
