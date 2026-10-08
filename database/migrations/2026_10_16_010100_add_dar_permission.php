<?php

use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Adds the `dar.manage` permission to existing environments and grants it to the
 * default roles exactly as RolesAndPermissionsSeeder does. Additive only: other role
 * grants (including any tuned in the admin panel) are left alone. On a fresh database
 * the roles do not exist yet, so only the permission row is created.
 */
return new class extends Migration
{
    private const PERMISSIONS = ['dar.manage'];

    public function up(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $permission) {
            Permission::findOrCreate($permission, RolesAndPermissionsSeeder::GUARD);
        }

        $registrar->forgetCachedPermissions();

        foreach (RolesAndPermissionsSeeder::ROLES as $roleName => $granted) {
            $role = Role::query()
                ->where('name', $roleName)
                ->where('guard_name', RolesAndPermissionsSeeder::GUARD)
                ->first();

            if ($role === null) {
                continue;
            }

            $grant = $granted === ['*'] ? self::PERMISSIONS : array_intersect(self::PERMISSIONS, $granted);

            if ($grant !== []) {
                $role->givePermissionTo(array_values($grant));
            }
        }

        $registrar->forgetCachedPermissions();
    }

    public function down(): void
    {
        Permission::query()
            ->whereIn('name', self::PERMISSIONS)
            ->where('guard_name', RolesAndPermissionsSeeder::GUARD)
            ->get()
            ->each->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
