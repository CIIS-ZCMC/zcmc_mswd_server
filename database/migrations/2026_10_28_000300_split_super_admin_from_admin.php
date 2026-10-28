<?php

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

/**
 * Splits the old all-powerful `Admin` into two roles: `Super Admin` (code `super_admin`,
 * everything, the only one for /admin) and `Admin` (every client module, no /admin).
 * Existing Admin users move to Super Admin, so they keep /admin and password sign-in.
 * On a fresh database no Admin exists yet and the seeder creates both roles.
 */
return new class extends Migration
{
    public function up(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->forgetCachedPermissions();

        $guard = RolesAndPermissionsSeeder::GUARD;
        $admin = Role::query()->where('code', 'admin')->where('guard_name', $guard)->first();

        if ($admin === null || Role::query()->where('code', 'super_admin')->where('guard_name', $guard)->exists()) {
            return;
        }

        $super = Role::create(['name' => 'Super Admin', 'code' => 'super_admin', 'guard_name' => $guard]);
        $super->syncPermissions(Permission::query()->where('guard_name', $guard)->get());

        DB::transaction(function () use ($admin, $super) {
            User::role($admin->name)->get()->each(function (User $user) use ($admin, $super) {
                $user->removeRole($admin);
                $user->assignRole($super);
                $user->syncRoleCache();
            });

            $admin->syncPermissions(RolesAndPermissionsSeeder::ROLES['Admin']);
        });

        $registrar->forgetCachedPermissions();
    }

    public function down(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->forgetCachedPermissions();

        $guard = RolesAndPermissionsSeeder::GUARD;
        $super = Role::query()->where('code', 'super_admin')->where('guard_name', $guard)->first();
        $admin = Role::query()->where('code', 'admin')->where('guard_name', $guard)->first();

        if ($super === null || $admin === null) {
            return;
        }

        DB::transaction(function () use ($super, $admin) {
            User::role($super->name)->get()->each(function (User $user) use ($super, $admin) {
                $user->removeRole($super);
                $user->assignRole($admin);
                $user->syncRoleCache();
            });

            $admin->syncPermissions(Permission::query()->where('guard_name', $admin->guard_name)->get());
            $super->delete();
        });

        $registrar->forgetCachedPermissions();
    }
};
