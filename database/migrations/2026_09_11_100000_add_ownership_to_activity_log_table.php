<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ownership columns on the audit trail, so a patient's or a case's history is
 * one indexed read instead of a fan-out over the unindexed morph pair.
 *
 * Deliberately no foreign keys: the trail has to outlive a hard-deleted subject,
 * and a row whose owner cannot be resolved must still land.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::connection(config('activitylog.database_connection'))
            ->table(config('activitylog.table_name'), function (Blueprint $table) {
                $table->unsignedBigInteger('patient_id')->nullable()->after('subject_id');
                $table->unsignedBigInteger('case_id')->nullable()->after('patient_id');

                // Paired with id, because every read is "this owner's rows,
                // newest first" — id doubles as the sort key.
                $table->index(['patient_id', 'id']);
                $table->index(['case_id', 'id']);
            });
    }

    public function down(): void
    {
        Schema::connection(config('activitylog.database_connection'))
            ->table(config('activitylog.table_name'), function (Blueprint $table) {
                $table->dropIndex(['patient_id', 'id']);
                $table->dropIndex(['case_id', 'id']);
                $table->dropColumn(['patient_id', 'case_id']);
            });
    }
};
