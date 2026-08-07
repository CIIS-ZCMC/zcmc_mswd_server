<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

function admin(): User
{
    $user = User::factory()->create();
    $user->assignRole(RolesAndPermissionsSeeder::SUPER_ADMIN);

    return $user;
}

// Guard-agnostic lookups: Spatie's findByName() resolves the default guard,
// which is `sanctum` under Sanctum::actingAs while our data lives under `web`.
function findRole(string $name): ?Role
{
    return Role::query()->where('name', $name)->first();
}

function findPerm(string $name): ?Permission
{
    return Permission::query()->where('name', $name)->first();
}

// --- Roles -----------------------------------------------------------------

it('creates a role with a description and permissions through the service stack', function () {
    Sanctum::actingAs(admin());

    $this->postJson('/api/roles', [
        'name' => 'Records Officer',
        'description' => 'Handles records only',
        'permissions' => ['patients.view', 'reports.view'],
    ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Records Officer')
        ->assertJsonPath('data.description', 'Handles records only')
        ->assertJsonPath('data.permissions', ['patients.view', 'reports.view']);

    $role = findRole('Records Officer');
    expect($role->description)->toBe('Handles records only')
        ->and($role->hasPermissionTo('patients.view'))->toBeTrue();
});

it('updates a role description and syncs its permissions', function () {
    Sanctum::actingAs(admin());
    $role = Role::create(['name' => 'Temp', 'guard_name' => RolesAndPermissionsSeeder::GUARD]);

    $this->putJson("/api/roles/{$role->id}", [
        'description' => 'Updated',
        'permissions' => ['cases.view'],
    ])
        ->assertOk()
        ->assertJsonPath('data.description', 'Updated')
        ->assertJsonPath('data.permissions', ['cases.view']);
});

it('deletes a non-core role', function () {
    Sanctum::actingAs(admin());
    $role = Role::create(['name' => 'Disposable', 'guard_name' => RolesAndPermissionsSeeder::GUARD]);

    $this->deleteJson("/api/roles/{$role->id}")->assertNoContent();

    expect(Role::find($role->id))->toBeNull();
});

it('forbids deleting a core role', function () {
    Sanctum::actingAs(admin());
    $role = findRole('Case Manager');

    $this->deleteJson("/api/roles/{$role->id}")->assertForbidden();

    expect(Role::find($role->id))->not->toBeNull();
});

it('forbids renaming the super admin role', function () {
    Sanctum::actingAs(admin());
    $role = findRole(RolesAndPermissionsSeeder::SUPER_ADMIN);

    $this->putJson("/api/roles/{$role->id}", ['name' => 'Root'])->assertForbidden();

    expect(findRole(RolesAndPermissionsSeeder::SUPER_ADMIN))->not->toBeNull();
});

// --- Permissions -----------------------------------------------------------

it('lists permissions', function () {
    Sanctum::actingAs(admin());

    $this->getJson('/api/permissions')
        ->assertOk()
        ->assertJsonPath('data.0.name', fn ($name) => is_string($name));
});

it('creates a custom permission', function () {
    Sanctum::actingAs(admin());

    $this->postJson('/api/permissions', [
        'name' => 'reports.export',
        'description' => 'Export reports to file',
    ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'reports.export')
        ->assertJsonPath('data.description', 'Export reports to file');

    expect(findPerm('reports.export'))->not->toBeNull();
});

it('forbids editing a core permission', function () {
    Sanctum::actingAs(admin());
    $permission = findPerm('patients.view');

    $this->putJson("/api/permissions/{$permission->id}", ['description' => 'hacked'])
        ->assertForbidden();
});

it('forbids deleting a core permission', function () {
    Sanctum::actingAs(admin());
    $permission = findPerm('roles.manage');

    $this->deleteJson("/api/permissions/{$permission->id}")->assertForbidden();

    expect(findPerm('roles.manage'))->not->toBeNull();
});

it('forbids permission management without roles.manage', function () {
    $user = User::factory()->create();
    $user->assignRole('Processor');
    Sanctum::actingAs($user);

    $this->postJson('/api/permissions', ['name' => 'x.y'])->assertForbidden();
});
