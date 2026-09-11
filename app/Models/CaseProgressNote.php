<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A worker's running record of case progress: contacts made, home visits,
 * follow-ups owed. Distinct from CaseActivity (system milestones) and from
 * Intervention (a service actually delivered).
 */
class CaseProgressNote extends Model
{
    use Auditable, SoftDeletes;

    public const TYPE_PROGRESS = 'progress';

    public const TYPE_HOME_VISIT = 'home_visit';

    public const TYPE_PHONE_FOLLOW_UP = 'phone_follow_up';

    public const TYPE_CONFERENCE = 'conference';

    public const TYPE_REFERRAL_FOLLOW_UP = 'referral_follow_up';

    public const TYPE_OTHER = 'other';

    /**
     * @var list<string>
     */
    public const TYPES = [
        self::TYPE_PROGRESS,
        self::TYPE_HOME_VISIT,
        self::TYPE_PHONE_FOLLOW_UP,
        self::TYPE_CONFERENCE,
        self::TYPE_REFERRAL_FOLLOW_UP,
        self::TYPE_OTHER,
    ];

    protected $fillable = [
        'case_id',
        'assessment_id',
        'author_id',
        'note_type',
        'note_date',
        'narrative',
        'follow_up_on',
        'follow_up_done_at',
        'follow_up_done_by',
    ];

    protected function casts(): array
    {
        return [
            'note_date' => 'date',
            'follow_up_on' => 'date',
            'follow_up_done_at' => 'datetime',
        ];
    }

    public function case(): BelongsTo
    {
        return $this->belongsTo(CaseModel::class, 'case_id');
    }

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class, 'assessment_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function followUpDoneBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'follow_up_done_by');
    }

    public function hasOpenFollowUp(): bool
    {
        return $this->follow_up_on !== null && $this->follow_up_done_at === null;
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
