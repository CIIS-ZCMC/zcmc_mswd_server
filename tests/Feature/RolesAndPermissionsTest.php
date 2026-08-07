<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

/**
 * Create a user and assign it the given role.
 */
function userWithRole(string $role): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);
    $user->syncRoleCache();

    return $user;
}

it('seeds the full permission catalog', function () {
    expect(Permission::count())->toBe(count(RolesAndPermissionsSeeder::PERMISSIONS));
});

it('seeds every default role with the expected permission counts', function () {
    expect(Role::pluck('name')->all())
        ->toEqualCanonicalizing(array_keys(RolesAndPermissionsSeeder::ROLES));

    expect(Role::findByName('System Administrator')->permissions)
        ->toHaveCount(count(RolesAndPermissionsSeeder::PERMISSIONS));

    expect(Role::findByName('Viewer')->permissions->pluck('name')->all())
        ->toEqualCanonicalizing(['patients.view', 'cases.view', 'assistance.view', 'reports.view']);
});

it('mirrors the assigned role into the role cache column', function () {
    $user = userWithRole('Social Worker');

    expect($user->fresh()->role)->toBe('Social Worker');
});

test('role permission matrix', function (string $role, string $permission, bool $allowed) {
    expect(userWithRole($role)->can($permission))->toBe($allowed);
})->with([
    'admin can manage roles' => ['System Administrator', 'roles.manage', true],
    'head can approve assistance' => ['MSWD Head', 'assistance.approve', true],
    'head cannot manage roles' => ['MSWD Head', 'roles.manage', false],
    'social worker can create cases' => ['Social Worker', 'cases.create', true],
    'social worker cannot approve assistance' => ['Social Worker', 'assistance.approve', false],
    'encoder cannot delete patients' => ['Encoder', 'patients.delete', false],
    'viewer can view patients' => ['Viewer', 'patients.view', true],
    'viewer cannot create patients' => ['Viewer', 'patients.create', false],
]);

it('lets an authorized user list roles', function () {
    Sanctum::actingAs(userWithRole('System Administrator'));

    $this->getJson('/api/roles')
        ->assertOk()
        ->assertJsonCount(count(RolesAndPermissionsSeeder::ROLES), 'data');
});

it('forbids listing roles without roles.manage', function () {
    Sanctum::actingAs(userWithRole('Viewer'));

    $this->getJson('/api/roles')->assertForbidden();
});

it('lets an admin sync another user\'s roles', function () {
    Sanctum::actingAs(userWithRole('System Administrator'));
    $target = userWithRole('Encoder');

    $this->putJson("/api/users/{$target->id}/roles", ['roles' => ['Social Worker']])
        ->assertOk()
        ->assertJsonPath('data.roles', ['Social Worker']);

    expect($target->fresh()->role)->toBe('Social Worker')
        ->and($target->fresh()->hasRole('Social Worker'))->toBeTrue()
        ->and($target->fresh()->hasRole('Encoder'))->toBeFalse();
});

it('forbids a non-admin from syncing roles', function () {
    Sanctum::actingAs(userWithRole('Social Worker'));
    $target = userWithRole('Encoder');

    $this->putJson("/api/users/{$target->id}/roles", ['roles' => ['System Administrator']])
        ->assertForbidden();

    expect($target->fresh()->hasRole('System Administrator'))->toBeFalse();
});

it('validates role names when syncing', function () {
    Sanctum::actingAs(userWithRole('System Administrator'));
    $target = userWithRole('Encoder');

    $this->putJson("/api/users/{$target->id}/roles", ['roles' => ['Nonexistent Role']])
        ->assertUnprocessable()
        ->assertJsonValidationErrorFor('roles.0');
});
