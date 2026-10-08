<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * One line of a worker's Daily Accomplishment Report: a registry patient served on a
 * day, with the activity done. Entered by hand by the worker and visible to them only.
 * Audited against the patient. See docs/DAR_PLAN.md.
 */
class DarEntry extends Model
{
    use Auditable, SoftDeletes;

    /** Activities a DAR line may record: key => printed label. */
    public const ACTIVITIES = [
        'interview' => 'Interview',
        'assessment' => 'Assessment',
        'counseling' => 'Counseling',
        'guarantee_assistance' => 'Guarantee / Assistance',
        'referral' => 'Referral',
        'follow_up' => 'Follow-up',
        'home_ward_visit' => 'Home/Ward Visit',
        'documentation' => 'Documentation',
        'other' => 'Other',
    ];

    protected $fillable = [
        'user_id',
        'patient_id',
        'entry_date',
        'served_time',
        'activity',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'entry_date' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    /** One worker's lines for one day, in the order they were served. */
    public function scopeForUserOn(Builder $query, User $user, Carbon $date): void
    {
        $query->where('user_id', $user->id)
            ->whereDate('entry_date', $date->toDateString())
            // Untimed lines last, then in the order they were entered.
            ->orderByRaw('served_time is null')
            ->orderBy('served_time')
            ->orderBy('id');
    }

    public function activityLabel(): string
    {
        return self::ACTIVITIES[$this->activity] ?? $this->activity;
    }

    /**
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        return ['patient_id' => $this->patient_id, 'case_id' => null];
    }
}
