<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Support\WatcherName;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PatientWatcher extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'patient_id',
        'name',
        'last_name',
        'first_name',
        'middle_name',
        'relationship_code',
        'contact_number',
        'address',
        'added_by',
        'notes',
    ];

    /**
     * `name` is always the composed full name. When the parts are given it is
     * built from them; a row written with only a `name` (seeders, older callers)
     * gets its parts split out of it instead.
     */
    protected static function booted(): void
    {
        static::saving(function (PatientWatcher $watcher) {
            if ($watcher->isDirty(['last_name', 'first_name', 'middle_name'])) {
                $watcher->name = WatcherName::compose($watcher->first_name, $watcher->middle_name, $watcher->last_name);
            } elseif ($watcher->isDirty('name')) {
                $parts = WatcherName::split($watcher->name);
                $watcher->first_name = $parts['first'];
                $watcher->middle_name = $parts['middle'];
                $watcher->last_name = $parts['last'];
            }
        });
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function relationshipType(): BelongsTo
    {
        return $this->belongsTo(WatcherRelationshipType::class, 'relationship_code', 'code');
    }

    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }

    /**
     * The cases this watcher is assigned to (live assignments only).
     */
    public function caseWatchers(): HasMany
    {
        return $this->hasMany(CaseWatcher::class);
    }

    /**
     * Watchers currently assigned to an open or ongoing case.
     */
    public function scopeOpenAssignments(Builder $query): Builder
    {
        return $query->whereHas('caseWatchers.case', fn ($case) => $case->whereIn('status', [
            CaseModel::STATUS_OPEN,
            CaseModel::STATUS_ONGOING,
        ]));
    }

    /**
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        return ['patient_id' => $this->patient_id, 'case_id' => null];
    }
}
