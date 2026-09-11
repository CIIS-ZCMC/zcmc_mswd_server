<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Spatie\Activitylog\Contracts\Activity;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Records an append-only field-level audit trail (old → new values, causer,
 * timestamp) for every create/update/delete on the model's fillable columns.
 *
 * Also stamps the patient and case each row belongs to, so a trail can be read
 * with one indexed query rather than a fan-out over the polymorphic subject.
 */
trait Auditable
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName(Str::snake(class_basename($this)));
    }

    /**
     * Called by the package just before the row is written.
     */
    public function tapActivity(Activity $activity, string $eventName): void
    {
        // A resolver reaches through relations that may be missing, soft-deleted
        // or mid-delete. None of that is worth losing the audit row over, let
        // alone rolling back the business write that triggered it — so an owner
        // that cannot be resolved is stored as null.
        try {
            $owner = $this->activityOwner();
        } catch (\Throwable) {
            $owner = [];
        }

        $activity->patient_id = $owner['patient_id'] ?? null;
        $activity->case_id = $owner['case_id'] ?? null;
    }

    /**
     * The patient and case this record's activity belongs to.
     *
     * Each model declares its own resolution; a central registry would drift
     * the moment a model moved. Resolvers must reach through `withTrashed()` —
     * on a `deleted` event the parent may itself already be soft-deleted, and
     * the row still has to be attributable.
     *
     * @return array{patient_id?: int|null, case_id?: int|null}
     */
    public function activityOwner(): array
    {
        return ['patient_id' => null, 'case_id' => null];
    }

    /**
     * A `belongsTo` parent, resolved even when it has since been soft-deleted,
     * and without a second query when the relation is already loaded.
     *
     * Only some parents soft-delete (`CaseModel`, `Patient`, `PatientAssistance`
     * do; `Assessment` and `Diagnostic` do not), so `withTrashed()` is applied
     * conditionally — calling it on a relation that lacks the trait is a fatal.
     *
     * Public rather than protected because the two-hop resolvers chain it across
     * unrelated classes (`AssessmentExpense` → `Assessment` → case). PHP grants
     * protected access only between classes in one hierarchy, and sharing a
     * trait does not create one.
     */
    public function auditParent(string $relation): ?Model
    {
        if ($this->relationLoaded($relation)) {
            return $this->getRelation($relation);
        }

        $query = $this->{$relation}();

        if (in_array(SoftDeletes::class, class_uses_recursive($query->getRelated()), true)) {
            $query->withTrashed();
        }

        return $query->first();
    }
}
