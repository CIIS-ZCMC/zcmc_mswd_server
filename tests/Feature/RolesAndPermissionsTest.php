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

    expect(Role::findByName('Admin')->permissions)
        ->toHaveCount(count(RolesAndPermissionsSeeder::PERMISSIONS));

    expect(Role::findByName('Processor')->permissions->pluck('name')->all())
        ->toEqualCanonicalizing([
            'patients.view', 'cases.view',
            'assistance.view', 'assistance.create', 'assistance.update',
            'intake.view', 'intake.create', 'intake.update',
            'reports.view',
        ]);
});

it('mirrors the assigned role into the role cache column', function () {
    $user = userWithRole('Case Manager');

    expect($user->fresh()->role)->toBe('Case Manager');
});

test('role permission matrix', function (string $role, string $permission, bool $allowed) {
    expect(userWithRole($role)->can($permission))->toBe($allowed);
})->with([
    'admin can manage roles' => ['Admin', 'roles.manage', true],
    'head can approve assistance' => ['MSS Head', 'assistance.approve', true],
    'head cannot manage roles' => ['MSS Head', 'roles.manage', false],
    'supervisor can approve assistance' => ['Supervisor', 'assistance.approve', true],
    'supervisor cannot manage settings' => ['Supervisor', 'settings.manage', false],
    'case manager can create cases' => ['Case Manager', 'cases.create', true],
    'case manager cannot approve assistance' => ['Case Manager', 'assistance.approve', false],
    'processor cannot delete patients' => ['Processor', 'patients.delete', false],
    'processor can update assistance' => ['Processor', 'assistance.update', true],
    'processor cannot create patients' => ['Processor', 'patients.create', false],
]);

it('lets an authorized user list roles', function () {
    Sanctum::actingAs(userWithRole('Admin'));

    $this->getJson('/api/roles')
        ->assertOk()
        ->assertJsonCount(count(RolesAndPermissionsSeeder::ROLES), 'data');
});

it('forbids listing roles without roles.manage', function () {
    Sanctum::actingAs(userWithRole('Processor'));

    $this->getJson('/api/roles')->assertForbidden();
});

it('lets an admin sync another user\'s roles', function () {
    Sanctum::actingAs(userWithRole('Admin'));
    $target = userWithRole('Processor');

    $this->putJson("/api/users/{$target->id}/roles", ['roles' => ['Case Manager']])
        ->assertOk()
        ->assertJsonPath('data.roles', ['Case Manager']);

    expect($target->fresh()->role)->toBe('Case Manager')
        ->and($target->fresh()->hasRole('Case Manager'))->toBeTrue()
        ->and($target->fresh()->hasRole('Processor'))->toBeFalse();
});

it('forbids a non-admin from syncing roles', function () {
    Sanctum::actingAs(userWithRole('Case Manager'));
    $target = userWithRole('Processor');

    $this->putJson("/api/users/{$target->id}/roles", ['roles' => ['Admin']])
        ->assertForbidden();

    expect($target->fresh()->hasRole('Admin'))->toBeFalse();
});

it('validates role names when syncing', function () {
    Sanctum::actingAs(userWithRole('Admin'));
    $target = userWithRole('Processor');

    $this->putJson("/api/users/{$target->id}/roles", ['roles' => ['Nonexistent Role']])
        ->assertUnprocessable()
        ->assertJsonValidationErrorFor('roles.0');
});
