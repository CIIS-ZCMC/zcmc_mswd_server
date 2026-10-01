<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

/**
 * The stored UnifiedIntakeSheet record (and its CRUD / finalize lifecycle) was
 * removed — the UIS is now only a printable gated by `intake.view`. Existing
 * environments still carry the old `intake.create/update/finalize/delete`
 * permission rows and their role grants; nothing references them. Fresh
 * databases never get them, so this is a no-op there.
 */
return new class extends Migration
{
    private const STALE = ['intake.create', 'intake.update', 'intake.finalize', 'intake.delete'];

    public function up(): void
    {
        $tables = config('permission.table_names');
        $pivotKey = config('permission.column_names.permission_pivot_key') ?? 'permission_id';

        $ids = DB::table($tables['permissions'])->whereIn('name', self::STALE)->pluck('id');

        if ($ids->isNotEmpty()) {
            DB::table($tables['role_has_permissions'])->whereIn($pivotKey, $ids)->delete();
            DB::table($tables['model_has_permissions'])->whereIn($pivotKey, $ids)->delete();
            DB::table($tables['permissions'])->whereIn('id', $ids)->delete();
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // The permissions are obsolete; there is nothing to restore.
    }
};
