<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The caretaker (custody) module was removed. Its audit rows stay in
 * activity_log; the audit viewer labels a subject whose class no longer
 * exists by its type alone.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('patient_caretakers');
    }

    /**
     * Recreates the table as 2026_07_07_081557_create_patient_caretakers_table
     * left it. The rows are not restored.
     */
    public function down(): void
    {
        $activeGuardExpression = match (DB::getDriverName()) {
            'mysql' => "IF(is_active = 1 AND deleted_at IS NULL, CONCAT(patient_id, '-', role), NULL)",
            default => "CASE WHEN is_active = 1 AND deleted_at IS NULL THEN patient_id || '-' || role ELSE NULL END",
        };

        Schema::create('patient_caretakers', function (Blueprint $table) use ($activeGuardExpression) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients');
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('assigned_by')->nullable()->constrained('users');
            $table->foreignId('unassigned_by')->nullable()->constrained('users');
            $table->string('role');
            $table->dateTime('assigned_date');
            $table->dateTime('unassigned_date')->nullable();
            $table->string('reason')->nullable();
            $table->string('unassigned_reason')->nullable();
            $table->foreignId('replaced_by_id')->nullable()->constrained('patient_caretakers');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->string('active_caretaker_guard')->nullable()->storedAs($activeGuardExpression);
            $table->unique('active_caretaker_guard', 'uniq_active_patient_caretaker');
        });
    }
};
