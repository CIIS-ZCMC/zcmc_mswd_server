<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Models\Activity as SpatieActivity;

/**
 * The audit trail row, extended with the ownership columns the caretake module
 * reads on.
 *
 * The package resolves a trail by its polymorphic subject, which makes "every
 * row belonging to this patient" a fan-out over the unindexed morph pair — one
 * `orWhere` branch per subject type. `patient_id` and `case_id` are stamped at
 * write time by {@see Auditable::tapActivity()} so the same
 * read becomes a single indexed query.
 *
 * Neither column carries a foreign key: the trail must outlive a hard-deleted
 * subject, and an unresolvable owner is stored as null rather than blocking the
 * write. Mass assignment needs no allowance here — the parent is `$guarded = []`.
 *
 * @property int|null $patient_id
 * @property int|null $case_id
 */
class Activity extends SpatieActivity
{
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function case(): BelongsTo
    {
        return $this->belongsTo(CaseModel::class, 'case_id');
    }

    public function scopeForPatient(Builder $query, int $patientId): Builder
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeForCase(Builder $query, int $caseId): Builder
    {
        return $query->where('case_id', $caseId);
    }

    /**
     * The inline per-record drill-down: one subject's own rows, ignoring
     * anything it owns.
     *
     * Distinct from the package's own `forSubject(Model $subject)`, which needs
     * a loaded instance. This one takes the morph pair directly, so a caller
     * holding only a type string and an id — the `/activity-log` filter, a row
     * whose subject has since been deleted — does not have to hydrate one.
     */
    public function scopeForSubjectKey(Builder $query, string $subjectType, int $subjectId): Builder
    {
        return $query
            ->where('subject_type', $subjectType)
            ->where('subject_id', $subjectId);
    }
}
