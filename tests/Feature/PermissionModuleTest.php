<?php

use App\Filament\Resources\Permissions\Pages\CreatePermission;
use App\Filament\Resources\Permissions\Pages\EditPermission;
use App\Filament\Resources\Permissions\PermissionResource;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Livewire\Livewire;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

function moduleUser(string $role): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);
    $user->syncRoleCache();

    return $user;
}

it('lets an admin create a custom permission through the panel', function () {
    actingAs(moduleUser('Admin'));

    Livewire::test(CreatePermission::class)
        ->fillForm(['name' => 'reports.export', 'guard_name' => 'web'])
        ->call('create')
        ->assertHasNoFormErrors();

    expect(Permission::where('name', 'reports.export')->where('guard_name', 'web')->exists())
        ->toBeTrue();
});

it('lets an admin rename a custom permission', function () {
    actingAs(moduleUser('Admin'));
    $permission = Permission::create(['name' => 'reports.export', 'guard_name' => 'web']);

    Livewire::test(EditPermission::class, ['record' => $permission->getKey()])
        ->fillForm(['name' => 'reports.download'])
        ->call('save')
        ->assertHasNoFormErrors();

    expect($permission->fresh()->name)->toBe('reports.download');
});

it('rejects a duplicate permission name', function () {
    actingAs(moduleUser('Admin'));

    Livewire::test(CreatePermission::class)
        ->fillForm(['name' => 'patients.view', 'guard_name' => 'web'])
        ->call('create')
        ->assertHasFormErrors(['name']);
});

it('protects core catalog permissions from edit and delete', function () {
    actingAs(moduleUser('Admin'));
    $core = Permission::findByName('patients.view');

    expect(PermissionResource::isCore($core))->toBeTrue()
        ->and(PermissionResource::canEdit($core))->toBeFalse()
        ->and(PermissionResource::canDelete($core))->toBeFalse();
});

it('allows edit and delete of custom permissions', function () {
    actingAs(moduleUser('Admin'));
    $custom = Permission::create(['name' => 'reports.export', 'guard_name' => 'web']);

    expect(PermissionResource::isCore($custom))->toBeFalse()
        ->and(PermissionResource::canEdit($custom))->toBeTrue()
        ->and(PermissionResource::canDelete($custom))->toBeTrue();
});

it('forbids permission management without roles.manage', function () {
    actingAs(moduleUser('Processor'));

    expect(PermissionResource::canViewAny())->toBeFalse()
        ->and(PermissionResource::canCreate())->toBeFalse();
});

it('prevents deleting the Admin super-admin role from anywhere', function () {
    $admin = Role::findByName('Admin');

    expect(fn () => $admin->delete())->toThrow(RuntimeException::class);
    expect(Role::whereKey($admin->getKey())->exists())->toBeTrue();
});

it('still allows deleting a non-super-admin role', function () {
    $role = Role::create(['name' => 'Temp', 'guard_name' => 'web']);

    $role->delete();

    expect(Role::where('name', 'Temp')->exists())->toBeFalse();
});

it('returns 403 when deleting the Admin role via the API', function () {
    Sanctum::actingAs(moduleUser('Admin'));
    $adminRole = Role::where('name', 'Admin')->firstOrFail();

    $this->deleteJson("/api/roles/{$adminRole->getKey()}")->assertForbidden();

    expect(Role::whereKey($adminRole->getKey())->exists())->toBeTrue();
});

it('deletes a custom role via the API', function () {
    Sanctum::actingAs(moduleUser('Admin'));
    $role = Role::create(['name' => 'Temp', 'guard_name' => 'web']);

    $this->deleteJson("/api/roles/{$role->getKey()}")->assertNoContent();

    expect(Role::where('name', 'Temp')->exists())->toBeFalse();
});
