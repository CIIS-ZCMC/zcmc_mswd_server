<?php

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Stamps ownership onto the rows written before the columns existed.
 *
 * Written as a migration rather than a command so a fresh deployment and an
 * existing one converge on the same state without anyone remembering to run
 * something. Idempotent: it only considers rows where both columns are still
 * null, so a re-run is a no-op and a partial run resumes.
 *
 * Rows whose subject has since been hard-deleted, or whose `subject_type` maps
 * to no model, keep null in both columns. That is correct: they stay in the
 * global log and stay out of patient and case trails, because nothing can say
 * whose they were.
 */
return new class extends Migration
{
    public function up(): void
    {
        $connection = config('activitylog.database_connection');
        $table = config('activitylog.table_name');

        if (! Schema::connection($connection)->hasTable($table)) {
            return;
        }

        DB::connection($connection)
            ->table($table)
            ->whereNull('patient_id')
            ->whereNull('case_id')
            ->whereNotNull('subject_type')
            ->whereNotNull('subject_id')
            ->orderBy('id')
            // Chunked by id so the table is never held in memory, and grouped by
            // subject_type inside each chunk so resolution costs one query per
            // type rather than one per row.
            ->chunkById(500, function ($rows) use ($connection, $table) {
                foreach ($rows->groupBy('subject_type') as $subjectType => $group) {
                    $model = $this->modelFor((string) $subjectType);

                    if ($model === null) {
                        continue;
                    }

                    $subjects = $model->newQuery()
                        ->when(
                            in_array(SoftDeletes::class, class_uses_recursive($model), true),
                            fn ($query) => $query->withTrashed(),
                        )
                        ->whereIn($model->getKeyName(), $group->pluck('subject_id')->unique())
                        ->get()
                        ->keyBy($model->getKeyName());

                    foreach ($group as $row) {
                        $subject = $subjects->get($row->subject_id);

                        if ($subject === null) {
                            continue;
                        }

                        try {
                            $owner = $subject->activityOwner();
                        } catch (Throwable) {
                            continue;
                        }

                        if (($owner['patient_id'] ?? null) === null && ($owner['case_id'] ?? null) === null) {
                            continue;
                        }

                        DB::connection($connection)->table($table)
                            ->where('id', $row->id)
                            ->update([
                                'patient_id' => $owner['patient_id'] ?? null,
                                'case_id' => $owner['case_id'] ?? null,
                            ]);
                    }
                }
            });
    }

    public function down(): void
    {
        // Intentionally empty. The columns themselves are dropped by the
        // migration that added them; clearing the values here would throw away
        // ownership that the live application has since stamped.
    }

    /**
     * The model behind a stored `subject_type`, or null when the class is gone,
     * is not a model, or does not participate in the audit trail.
     */
    private function modelFor(string $subjectType): ?object
    {
        $class = Relation::getMorphedModel($subjectType) ?? $subjectType;

        if (! class_exists($class)) {
            return null;
        }

        if (! in_array(Auditable::class, class_uses_recursive($class), true)) {
            return null;
        }

        return new $class;
    }
};
