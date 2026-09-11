<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * `status`, `case_type`, `priority_level` and `date_opened` are the columns
 * CaseModelRepository declares filterable and sortable — and every one of them
 * was unindexed. The caseload queue reads all four on every request.
 *
 * Deployment note: ALTER TABLE ... ADD INDEX is online on MySQL 8 / MariaDB
 * 10.x but briefly takes a metadata lock, so run it in a maintenance window if
 * `cases` is large.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            // The caseload query's leading predicate: one worker's open cases.
            $table->index(['assigned_user_id', 'status'], 'cases_assigned_user_status_index');
            // The default list sort, narrowed by status.
            $table->index(['status', 'date_opened'], 'cases_status_date_opened_index');
            $table->index('case_type');
            $table->index('priority_level');
        });
    }

    public function down(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            // MySQL drops the assigned_user_id foreign key's auto-created index
            // once the composite one above can serve the constraint, which
            // leaves the composite as the only index backing that key — and
            // MySQL then refuses to drop it (errno 1553). Put the plain index
            // back first, restoring exactly the baseline shape.
            if (DB::getDriverName() === 'mysql') {
                $table->index('assigned_user_id', 'cases_assigned_user_id_foreign');
            }
        });

        Schema::table('cases', function (Blueprint $table) {
            $table->dropIndex('cases_assigned_user_status_index');
            $table->dropIndex('cases_status_date_opened_index');
            $table->dropIndex(['case_type']);
            $table->dropIndex(['priority_level']);
        });
    }
};
