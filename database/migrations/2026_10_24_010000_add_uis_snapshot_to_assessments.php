<?php

use App\Services\UisSnapshotService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Freezes each Intake Assessment's copy of the patient: the UIS printed what the
 * patient's records say *now*, so editing the patient rewrote an issued sheet.
 * The snapshot is taken at creation (refreshed only on request), the interview
 * stamp is recorded instead of being the print date, and the household size the
 * classification divided by is kept so the per-capita income stops moving.
 *
 * Existing intakes are backfilled from today's data — their original values are
 * gone, and this at least stops the drift. See docs/UIS_SNAPSHOT_PLAN.md.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->json('uis_snapshot')->nullable()->after('encounter_date');
            $table->timestamp('uis_snapshot_at')->nullable()->after('uis_snapshot');
            $table->foreignId('uis_snapshot_by')->nullable()->after('uis_snapshot_at')->constrained('users')->nullOnDelete();
            $table->dateTime('interviewed_at')->nullable()->after('uis_snapshot_by');
            $table->foreignId('interviewed_by')->nullable()->after('interviewed_at')->constrained('users')->nullOnDelete();
            $table->unsignedInteger('household_size')->nullable()->after('net_per_capita_income');
        });

        app(UisSnapshotService::class)->backfill();
    }

    public function down(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('uis_snapshot_by');
            $table->dropConstrainedForeignId('interviewed_by');
            $table->dropColumn(['uis_snapshot', 'uis_snapshot_at', 'interviewed_at', 'household_size']);
        });
    }
};
