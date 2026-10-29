<?php

use App\Models\Role;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

/**
 * Splits HIS import off patients.create into its own `patients.import`, granted to
 * every role but Head. Existing roles are matched by code and only gain the
 * permission, so edits made to them since seeding are kept. On a fresh database
 * no roles exist yet and the seeder grants it.
 */
return new class extends Migration
{
    /**
     * @var list<string>
     */
    private const ROLE_CODES = ['super_admin', 'admin', 'supervisor', 'case_manager', 'processor'];

    public function up(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->forgetCachedPermissions();

        $guard = RolesAndPermissionsSeeder::GUARD;
        $roles = Role::query()->whereIn('code', self::ROLE_CODES)->where('guard_name', $guard)->get();

        if ($roles->isEmpty()) {
            return;
        }

        $permission = Permission::findOrCreate('patients.import', $guard);
        $roles->each(fn (Role $role) => $role->givePermissionTo($permission));

        $registrar->forgetCachedPermissions();
    }

    public function down(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->forgetCachedPermissions();

        Permission::query()
            ->where('name', 'patients.import')
            ->where('guard_name', RolesAndPermissionsSeeder::GUARD)
            ->delete();

        $registrar->forgetCachedPermissions();
    }
};
