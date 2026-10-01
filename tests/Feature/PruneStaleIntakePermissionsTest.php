<?php

use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function pruneMigration(): object
{
    return require database_path('migrations/2026_10_01_010000_prune_stale_intake_permissions.php');
}

it('removes the stale intake.* permissions and their role grants but keeps intake.view', function () {
    test()->seed(RolesAndPermissionsSeeder::class);

    // Recreate what an environment from before the UIS became a printable carries.
    $role = Role::findByName('MSS Head', 'web');
    foreach (['intake.create', 'intake.update', 'intake.finalize', 'intake.delete'] as $name) {
        $role->givePermissionTo(Permission::findOrCreate($name, 'web'));
    }

    pruneMigration()->up();

    expect(Permission::whereIn('name', ['intake.create', 'intake.update', 'intake.finalize', 'intake.delete'])->count())->toBe(0)
        ->and(DB::table('role_has_permissions')->whereNotIn('permission_id', Permission::pluck('id'))->count())->toBe(0)
        ->and(Role::findByName('MSS Head', 'web')->fresh()->hasPermissionTo('intake.view'))->toBeTrue();
});

it('is a no-op when the stale permissions are already gone', function () {
    test()->seed(RolesAndPermissionsSeeder::class);
    $before = Permission::count();

    pruneMigration()->up();
    pruneMigration()->up();

    expect(Permission::count())->toBe($before);
});
