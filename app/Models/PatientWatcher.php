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
        'first_name',
        'middle_name',
        'last_name',
        'relationship_code',
        'contact_number',
        'address',
        'added_by',
        'notes',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $model) {
            if ($model->first_name && $model->last_name) {
                if (empty($model->name) || $model->isDirty('first_name') || $model->isDirty('middle_name') || $model->isDirty('last_name')) {
                    $model->name = trim(preg_replace('/\s+/', ' ', "{$model->first_name} {$model->middle_name} {$model->last_name}"));
                }
            } elseif (! empty($model->name) && empty($model->first_name) && empty($model->last_name)) {
                $trimmed = trim($model->name);
                if (str_contains($trimmed, ',')) {
                    $parts = explode(',', $trimmed, 2);
                    $model->last_name = trim($parts[0]);
                    $rest = preg_split('/\s+/', trim($parts[1] ?? '')) ?: [];
                    $model->first_name = $rest[0] ?? null;
                    $model->middle_name = count($rest) > 1 ? implode(' ', array_slice($rest, 1)) : null;
                } else {
                    $parts = preg_split('/\s+/', $trimmed) ?: [];
                    if (count($parts) === 1) {
                        $model->first_name = $parts[0];
                        $model->last_name = $parts[0];
                    } elseif (count($parts) === 2) {
                        $model->first_name = $parts[0];
                        $model->last_name = $parts[1];
                    } else {
                        $model->first_name = $parts[0];
                        $model->middle_name = implode(' ', array_slice($parts, 1, -1));
                        $model->last_name = end($parts);
                    }
                }
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
