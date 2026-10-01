<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // "At most one live caretaker per patient and role" is enforced with a
        // generated column: it collapses to NULL for every inactive or
        // soft-deleted row, and a unique index ignores NULLs, so only two live
        // rows on the same patient and role can collide. CONCAT/IF are MySQL
        // (production); SQLite (the test suite's driver) needs || and CASE WHEN.
        $activeGuardExpression = match (DB::getDriverName()) {
            'mysql' => "IF(is_active = 1 AND deleted_at IS NULL, CONCAT(patient_id, '-', role), NULL)",
            default => "CASE WHEN is_active = 1 AND deleted_at IS NULL THEN patient_id || '-' || role ELSE NULL END",
        };

        Schema::create('patient_caretakers', function (Blueprint $table) use ($activeGuardExpression) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients');
            $table->foreignId('user_id')->constrained('users');
            // Who acted, as distinct from who holds the assignment.
            $table->foreignId('assigned_by')->nullable()->constrained('users');
            $table->foreignId('unassigned_by')->nullable()->constrained('users');
            $table->string('role');   // social_worker, case_manager, nurse, counselor, others
            $table->dateTime('assigned_date');
            $table->dateTime('unassigned_date')->nullable();
            $table->string('reason')->nullable();
            $table->string('unassigned_reason')->nullable();
            // Links a superseded row to the one that replaced it, so a handover
            // chain can be read in either direction.
            $table->foreignId('replaced_by_id')->nullable()->constrained('patient_caretakers');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->string('active_caretaker_guard')->nullable()->storedAs($activeGuardExpression);
            $table->unique('active_caretaker_guard', 'uniq_active_patient_caretaker');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_caretakers');
    }
};
