<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Custody hardening: who made and ended an assignment, why, what replaced it,
 * and a database-level guarantee that a patient has at most one active
 * caretaker per role.
 *
 * Every new column is nullable — existing rows genuinely have none of this
 * history and inventing it would be worse than leaving it absent.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_caretakers', function (Blueprint $table) {
            // Who acted, as distinct from who holds the assignment.
            $table->foreignId('assigned_by')->nullable()->after('user_id')->constrained('users');
            $table->foreignId('unassigned_by')->nullable()->after('assigned_by')->constrained('users');

            $table->string('reason')->nullable()->after('unassigned_date');
            $table->string('unassigned_reason')->nullable()->after('reason');

            // Links a superseded row to the one that replaced it, so a handover
            // chain can be read in either direction.
            $table->foreignId('replaced_by_id')->nullable()->after('unassigned_reason')
                ->constrained('patient_caretakers');
        });

        $this->repairDriftedRows();

        Schema::table('patient_caretakers', function (Blueprint $table) {
            // Same shape as uniq_case_primary_watcher: a generated column that
            // collapses to NULL for every inactive or soft-deleted row, under a
            // unique index that ignores NULLs — so only two *live* rows on the
            // same patient and role can collide.
            //
            // MySQL is production and SQLite is the test driver; they differ on
            // both the concatenation operator and on what ALTER TABLE accepts.
            // SQLite cannot add a STORED generated column to an existing table
            // at all, only a VIRTUAL one, and indexes both kinds happily.
            $expression = match (DB::getDriverName()) {
                'mysql' => "IF(is_active = 1 AND deleted_at IS NULL, CONCAT(patient_id, '-', role), NULL)",
                default => "CASE WHEN is_active = 1 AND deleted_at IS NULL THEN patient_id || '-' || role ELSE NULL END",
            };

            $column = $table->string('active_caretaker_guard')->nullable();

            DB::getDriverName() === 'mysql'
                ? $column->storedAs($expression)
                : $column->virtualAs($expression);

            $table->unique('active_caretaker_guard', 'uniq_active_patient_caretaker');
        });
    }

    public function down(): void
    {
        Schema::table('patient_caretakers', function (Blueprint $table) {
            $table->dropUnique('uniq_active_patient_caretaker');
            $table->dropColumn('active_caretaker_guard');

            $table->dropConstrainedForeignId('assigned_by');
            $table->dropConstrainedForeignId('unassigned_by');
            $table->dropConstrainedForeignId('replaced_by_id');
            $table->dropColumn(['reason', 'unassigned_reason']);
        });
    }

    /**
     * The unique index cannot be added over rows that already contradict it,
     * so the existing data is reconciled first.
     */
    private function repairDriftedRows(): void
    {
        // 1. is_active and unassigned_date were written independently and can
        //    disagree. An ended assignment still flagged active is drift, not a
        //    second live caretaker — trust the date.
        DB::table('patient_caretakers')
            ->whereNotNull('unassigned_date')
            ->where('is_active', true)
            ->update(['is_active' => false]);

        // 2. Genuine duplicates: keep the newest assignment per patient+role and
        //    retire the rest. unassigned_reason is deliberately left null so a
        //    repaired row stays distinguishable from a real handover.
        $duplicates = DB::table('patient_caretakers')
            ->select('patient_id', 'role')
            ->whereNull('deleted_at')
            ->where('is_active', true)
            ->groupBy('patient_id', 'role')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($duplicates as $duplicate) {
            $keeper = DB::table('patient_caretakers')
                ->whereNull('deleted_at')
                ->where('is_active', true)
                ->where('patient_id', $duplicate->patient_id)
                ->where('role', $duplicate->role)
                ->orderByDesc('assigned_date')
                ->orderByDesc('id')
                ->value('id');

            DB::table('patient_caretakers')
                ->whereNull('deleted_at')
                ->where('is_active', true)
                ->where('patient_id', $duplicate->patient_id)
                ->where('role', $duplicate->role)
                ->where('id', '!=', $keeper)
                ->update([
                    'is_active' => false,
                    'unassigned_date' => now(),
                ]);
        }
    }
};
