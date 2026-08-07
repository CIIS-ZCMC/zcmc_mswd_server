<?php

use App\Filament\Resources\Roles\Pages\CreateRole;
use App\Filament\Resources\Roles\Pages\EditRole;
use App\Filament\Resources\Roles\RoleResource;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

function roleModuleUser(string $role): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);
    $user->syncRoleCache();

    return $user;
}

function permissionIds(array $names): array
{
    return Permission::query()->whereIn('name', $names)->pluck('id')->all();
}

it('lets an admin reach the roles list', function () {
    actingAs(roleModuleUser('Admin'));

    $this->get('/admin/roles')->assertOk();
});

it('creates a role with description and permissions, pinned to the web guard', function () {
    actingAs(roleModuleUser('Admin'));

    Livewire::test(CreateRole::class)
        ->fillForm([
            'name' => 'Records Officer',
            'description' => 'Handles records',
            'permissions' => permissionIds(['patients.view', 'reports.view']),
        ])
        ->call('create')
        ->assertHasNoFormErrors();

    $role = Role::query()->where('name', 'Records Officer')->first();

    expect($role)->not->toBeNull()
        ->and($role->guard_name)->toBe(RolesAndPermissionsSeeder::GUARD)
        ->and($role->description)->toBe('Handles records')
        ->and($role->hasPermissionTo('patients.view'))->toBeTrue()
        ->and($role->hasPermissionTo('reports.view'))->toBeTrue();
});

it('edits a role to sync its permissions', function () {
    actingAs(roleModuleUser('Admin'));
    $role = Role::create(['name' => 'Editable', 'guard_name' => RolesAndPermissionsSeeder::GUARD]);

    Livewire::test(EditRole::class, ['record' => $role->getKey()])
        ->fillForm(['permissions' => permissionIds(['cases.view'])])
        ->call('save')
        ->assertHasNoFormErrors();

    expect($role->fresh()->hasPermissionTo('cases.view'))->toBeTrue();
});

it('rejects a duplicate role name', function () {
    actingAs(roleModuleUser('Admin'));

    Livewire::test(CreateRole::class)
        ->fillForm(['name' => 'Case Manager'])
        ->call('create')
        ->assertHasFormErrors(['name']);
});

it('protects core roles from deletion but allows custom roles', function () {
    actingAs(roleModuleUser('Admin'));
    $core = Role::query()->where('name', 'Case Manager')->first();
    $custom = Role::create(['name' => 'Custom', 'guard_name' => RolesAndPermissionsSeeder::GUARD]);

    expect(RoleResource::isCore($core))->toBeTrue()
        ->and(RoleResource::canDelete($core))->toBeFalse()
        ->and(RoleResource::isCore($custom))->toBeFalse()
        ->and(RoleResource::canDelete($custom))->toBeTrue();
});

it('flags the super admin role', function () {
    $admin = Role::query()->where('name', 'Admin')->first();

    expect(RoleResource::isSuperAdmin($admin))->toBeTrue()
        ->and(RoleResource::canDelete($admin))->toBeFalse();
});

it('hides role management from users without roles.manage', function () {
    actingAs(roleModuleUser('MSS Head')); // panel.access + users.view, no roles.manage

    expect(RoleResource::canViewAny())->toBeFalse()
        ->and(RoleResource::canCreate())->toBeFalse();

    $this->get('/admin/roles')->assertForbidden();
});

it('grants the super admin every ability via Gate::before', function () {
    $admin = roleModuleUser('Admin');

    expect($admin->can('a.nonexistent.ability'))->toBeTrue();
});
