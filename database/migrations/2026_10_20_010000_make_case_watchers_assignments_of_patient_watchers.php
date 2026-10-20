<?php

use App\Support\WatcherRelationshipMapper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * docs/WATCHER_MODULE_PLAN.md, Phase 1.
 *
 * patient_watchers becomes the single record of who a watcher is; case_watchers
 * becomes a pure assignment of that person to a case (primary, informant, pass,
 * presence, notes). The name/relationship/contact/address copies on case_watchers
 * are dropped, and patient_watchers.relationship (free text) becomes
 * relationship_code.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_watchers', function (Blueprint $table) {
            $table->string('relationship_code')->nullable()->after('name')->index();
            $table->foreignId('added_by')->nullable()->after('address')->constrained('users');
            $table->text('notes')->nullable()->after('added_by');
        });

        $this->backfillRelationshipCodes();
        $this->linkAdHocCaseWatchers();
        $this->softDeleteDuplicateAssignments();

        Schema::table('patient_watchers', function (Blueprint $table) {
            $table->dropColumn(['relationship', 'is_primary']);
        });

        Schema::table('case_watchers', function (Blueprint $table) {
            $table->dropColumn(['name', 'relationship', 'contact_number', 'address']);
        });

        Schema::table('case_watchers', function (Blueprint $table) {
            $table->unsignedBigInteger('patient_watcher_id')->nullable(false)->change();
        });

        // A watcher is assigned to a case at most once while the row is live.
        // Same generated-column pattern as primary_key_guard: NULL when
        // soft-deleted, so a removed assignment can be re-created.
        $expression = match (DB::getDriverName()) {
            'mysql' => "IF(deleted_at IS NULL, CONCAT(case_id, '-', patient_watcher_id), NULL)",
            default => "CASE WHEN deleted_at IS NULL THEN case_id || '-' || patient_watcher_id ELSE NULL END",
        };

        Schema::table('case_watchers', function (Blueprint $table) use ($expression) {
            // SQLite cannot ADD a STORED column to an existing table, only a VIRTUAL one;
            // a unique index over either behaves the same.
            $column = $table->string('assignment_guard')->nullable();
            DB::getDriverName() === 'mysql' ? $column->storedAs($expression) : $column->virtualAs($expression);
            $table->unique('assignment_guard', 'uniq_case_watcher_assignment');
        });
    }

    public function down(): void
    {
        Schema::table('case_watchers', function (Blueprint $table) {
            $table->dropUnique('uniq_case_watcher_assignment');
            $table->dropColumn('assignment_guard');
        });

        Schema::table('case_watchers', function (Blueprint $table) {
            $table->string('name')->default('')->after('patient_watcher_id');
            $table->string('relationship')->default('other')->after('name');
            $table->string('contact_number')->nullable()->after('relationship');
            $table->string('address')->nullable()->after('contact_number');
            $table->unsignedBigInteger('patient_watcher_id')->nullable()->change();
        });

        Schema::table('patient_watchers', function (Blueprint $table) {
            $table->string('relationship')->nullable()->after('name');
            $table->boolean('is_primary')->default(false)->after('address');
        });

        // Re-snapshot the copied fields from the linked directory row.
        DB::table('patient_watchers')->orderBy('id')->each(function ($watcher) {
            DB::table('patient_watchers')->where('id', $watcher->id)->update(['relationship' => $watcher->relationship_code]);
            DB::table('case_watchers')->where('patient_watcher_id', $watcher->id)->update([
                'name' => $watcher->name,
                'relationship' => $watcher->relationship_code ?? 'other',
                'contact_number' => $watcher->contact_number,
                'address' => $watcher->address,
            ]);
        });

        Schema::table('patient_watchers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('added_by');
            $table->dropIndex(['relationship_code']);
            $table->dropColumn(['relationship_code', 'notes']);
        });
    }

    private function backfillRelationshipCodes(): void
    {
        $mapper = new WatcherRelationshipMapper;

        DB::table('patient_watchers')->orderBy('id')->each(function ($watcher) use ($mapper) {
            DB::table('patient_watchers')->where('id', $watcher->id)->update([
                'relationship_code' => $mapper->toCode($watcher->relationship),
            ]);
        });
    }

    /**
     * Case watchers created ad hoc (no directory row) get one, built from the
     * fields they carry, so patient_watcher_id can become NOT NULL.
     */
    private function linkAdHocCaseWatchers(): void
    {
        $mapper = new WatcherRelationshipMapper;
        $now = now();

        DB::table('case_watchers')->whereNull('patient_watcher_id')->orderBy('id')->each(function ($row) use ($mapper, $now) {
            $patientId = DB::table('cases')->where('id', $row->case_id)->value('patient_id');

            $watcherId = DB::table('patient_watchers')->insertGetId([
                'patient_id' => $patientId,
                'name' => $row->name,
                'relationship_code' => $mapper->toCode($row->relationship),
                'contact_number' => $row->contact_number,
                'address' => $row->address,
                'added_by' => $row->added_by,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('case_watchers')->where('id', $row->id)->update(['patient_watcher_id' => $watcherId]);
        });
    }

    /**
     * Older rows may assign the same person to a case twice. Keep one live row
     * per pair (the primary one first, then the oldest) before the unique guard.
     */
    private function softDeleteDuplicateAssignments(): void
    {
        $seen = [];

        DB::table('case_watchers')->whereNull('deleted_at')
            ->orderByDesc('is_primary')->orderBy('id')
            ->each(function ($row) use (&$seen) {
                $key = $row->case_id.'-'.$row->patient_watcher_id;

                if (isset($seen[$key])) {
                    DB::table('case_watchers')->where('id', $row->id)->update(['deleted_at' => now(), 'is_primary' => false]);

                    return;
                }

                $seen[$key] = true;
            });
    }
};
