<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The Social Case Study Report lives on the assessment row — docs/SOCIAL_CASE_PLAN.md §A.0/§A.1.
 *
 * `social_case_status` is the load-bearing column: NULL means "an ordinary
 * intake-time assessment", non-NULL means "this row *is* the case's SCSR".
 * A generated-column unique guard lets a case carry any number of the former
 * and at most one of the latter, so intake appending keeps working untouched.
 *
 * Every new column is nullable or defaulted, so `social_case_guard` is NULL on
 * every existing row and the index is satisfiable the instant it is created —
 * no data repair step.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            // Lifecycle. NULL = an ordinary assessment row, not the case's SCSR.
            $table->string('social_case_status')->nullable()->after('classification'); // draft|for_review|finalized
            $table->string('social_case_no')->nullable()->unique()->after('social_case_status'); // SCSR-{year}-{6}
            $table->unsignedInteger('revision')->default(1)->after('social_case_no');

            // Sign-off — the document's two signature blocks, nothing more.
            $table->foreignId('prepared_by')->nullable()->after('created_by')->constrained('users');
            $table->dateTime('prepared_at')->nullable()->after('prepared_by');
            $table->foreignId('noted_by')->nullable()->after('prepared_at')->constrained('users');
            $table->dateTime('noted_at')->nullable()->after('noted_by');
            $table->dateTime('review_requested_at')->nullable()->after('noted_at');

            // Narrative sections the existing five text columns don't cover.
            $table->string('referral_source')->nullable()->after('presenting_problem');
            $table->text('reason_for_referral')->nullable()->after('referral_source');
            $table->text('medical_history')->nullable()->after('family_background');
            $table->text('recommendation')->nullable()->after('assessment_notes');
            $table->string('recommended_assistance')->nullable()->after('recommendation');
            $table->decimal('recommended_amount', 12, 2)->nullable()->after('recommended_assistance');

            $table->index('social_case_status');
        });

        // Second call: the generated column references social_case_status and
        // deleted_at, so both must already exist on the table.
        Schema::table('assessments', function (Blueprint $table) {
            // Same shape as uniq_case_primary_watcher / uniq_active_patient_caretaker.
            // SQLite cannot ALTER TABLE ADD a STORED generated column, only a
            // VIRTUAL one, and indexes both. (case_watchers got away with
            // storedAs because its guard is declared inside CREATE TABLE; this
            // is an ALTER, like the caretaker migration.)
            $expression = match (DB::getDriverName()) {
                'mysql' => 'IF(social_case_status IS NOT NULL AND deleted_at IS NULL, case_id, NULL)',
                default => 'CASE WHEN social_case_status IS NOT NULL AND deleted_at IS NULL THEN case_id ELSE NULL END',
            };

            $column = $table->unsignedBigInteger('social_case_guard')->nullable();

            DB::getDriverName() === 'mysql'
                ? $column->storedAs($expression)
                : $column->virtualAs($expression);

            $table->unique('social_case_guard', 'uniq_case_social_case');
        });
    }

    public function down(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->dropUnique('uniq_case_social_case');
            $table->dropColumn('social_case_guard');
        });

        Schema::table('assessments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('prepared_by');
            $table->dropConstrainedForeignId('noted_by');

            $table->dropIndex(['social_case_status']);
            $table->dropUnique(['social_case_no']);

            $table->dropColumn([
                'social_case_status',
                'social_case_no',
                'revision',
                'prepared_at',
                'noted_at',
                'review_requested_at',
                'referral_source',
                'reason_for_referral',
                'medical_history',
                'recommendation',
                'recommended_assistance',
                'recommended_amount',
            ]);
        });
    }
};
