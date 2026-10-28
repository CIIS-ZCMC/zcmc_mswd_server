<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // "At most one live primary watcher per case" is enforced with a
        // generated column: it collapses to NULL for every non-primary or
        // soft-deleted row, and a unique index ignores NULLs, so only two
        // live primaries on the same case can collide. IF() is MySQL
        // (production); SQLite (the test suite's driver) needs CASE WHEN.
        $primaryGuardExpression = match (DB::getDriverName()) {
            'mysql' => 'IF(is_primary = 1 AND deleted_at IS NULL, case_id, NULL)',
            default => 'CASE WHEN is_primary = 1 AND deleted_at IS NULL THEN case_id ELSE NULL END',
        };

        // A person is assigned to a case at most once while the assignment is live.
        $assignmentGuardExpression = match (DB::getDriverName()) {
            'mysql' => "IF(deleted_at IS NULL, CONCAT(case_id, '-', patient_watcher_id), NULL)",
            default => "CASE WHEN deleted_at IS NULL THEN case_id || '-' || patient_watcher_id ELSE NULL END",
        };

        Schema::create('case_watchers', function (Blueprint $table) use ($primaryGuardExpression, $assignmentGuardExpression) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases');
            // The person is a patient_watchers row; this table is only the assignment.
            $table->foreignId('patient_watcher_id')->constrained('patient_watchers');

            $table->boolean('is_primary')->default(false);
            $table->boolean('is_informant')->default(false);

            // Ward pass — the fields the client already renders but cannot store.
            $table->string('pass_number')->nullable()->unique();
            $table->date('pass_valid_until')->nullable();
            $table->string('pass_status')->default('active'); // active|expired|revoked

            // Rotation within one admission.
            $table->dateTime('present_from')->nullable();
            $table->dateTime('present_until')->nullable();

            $table->foreignId('added_by')->constrained('users');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['case_id', 'is_primary']);

            $table->unsignedBigInteger('primary_key_guard')->nullable()->storedAs($primaryGuardExpression);
            $table->unique('primary_key_guard', 'uniq_case_primary_watcher');

            $column = $table->string('assignment_guard')->nullable();
            DB::getDriverName() === 'mysql' ? $column->storedAs($assignmentGuardExpression) : $column->virtualAs($assignmentGuardExpression);
            $table->unique('assignment_guard', 'uniq_case_watcher_assignment');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('case_watchers');
    }
};
