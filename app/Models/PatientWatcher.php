<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
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
        'relationship_code',
        'contact_number',
        'address',
        'added_by',
        'notes',
    ];

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
