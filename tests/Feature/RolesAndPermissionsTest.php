<?php

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;

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

    expect(Role::findByName('Super Admin')->permissions)
        ->toHaveCount(count(RolesAndPermissionsSeeder::PERMISSIONS));

    // Admin holds every client module and none of the /admin panel.
    expect(Role::findByName('Admin')->permissions->pluck('name')->all())
        ->toEqualCanonicalizing(array_values(array_diff(
            RolesAndPermissionsSeeder::PERMISSIONS,
            ['panel.access', 'users.manage', 'roles.manage', 'settings.manage'],
        )));

    expect(Role::findByName('Processor')->permissions->pluck('name')->all())
        ->toEqualCanonicalizing([
            'patients.view', 'hospital-patients.view',
            'intake.view',
            'socioeconomic.view',
            'guarantee.view',
            'queue.manage', 'dar.manage',
        ]);

    expect(Role::findByName('Head')->permissions->pluck('name')->all())
        ->toEqualCanonicalizing([
            'reports.view', 'reports.generate',
            'assistance.approve', 'cases.finalize_social_case', 'cases.waive_watcher',
        ]);
});

it('mirrors the assigned role into the role cache column', function () {
    $user = userWithRole('Case Manager');

    expect($user->fresh()->role)->toBe('Case Manager');
});

test('role permission matrix', function (string $role, string $permission, bool $allowed) {
    expect(userWithRole($role)->can($permission))->toBe($allowed);
})->with([
    'super admin can manage roles' => ['Super Admin', 'roles.manage', true],
    'super admin opens the admin panel' => ['Super Admin', 'panel.access', true],
    'admin cannot manage roles' => ['Admin', 'roles.manage', false],
    'admin cannot open the admin panel' => ['Admin', 'panel.access', false],
    'admin reaches every client module' => ['Admin', 'cases.finalize_social_case', true],
    'admin reads the audit trail' => ['Admin', 'audit.view_protective', true],
    'admin lists users for assignment' => ['Admin', 'users.view', true],
    'head generates reports' => ['Head', 'reports.generate', true],
    'head has no patients' => ['Head', 'patients.view', false],
    'head has no cases' => ['Head', 'cases.view', false],
    'head has no queue' => ['Head', 'queue.manage', false],
    'head has no DAR' => ['Head', 'dar.manage', false],
    'head cannot manage roles' => ['Head', 'roles.manage', false],
    'head cannot open the admin panel' => ['Head', 'panel.access', false],
    'supervisor edits patients' => ['Supervisor', 'patients.update', true],
    'supervisor merges patients' => ['Supervisor', 'patients.merge', true],
    'supervisor generates reports' => ['Supervisor', 'reports.generate', true],
    'supervisor times the queue' => ['Supervisor', 'queue.manage', true],
    'supervisor keeps a DAR' => ['Supervisor', 'dar.manage', true],
    'supervisor has no cases' => ['Supervisor', 'cases.view', false],
    'supervisor approves assistance' => ['Supervisor', 'assistance.approve', true],
    'supervisor finalizes social cases' => ['Supervisor', 'cases.finalize_social_case', true],
    'supervisor waives the watcher requirement' => ['Supervisor', 'cases.waive_watcher', true],
    'head approves assistance' => ['Head', 'assistance.approve', true],
    'head finalizes social cases' => ['Head', 'cases.finalize_social_case', true],
    'head waives the watcher requirement' => ['Head', 'cases.waive_watcher', true],
    'case manager works cases' => ['Case Manager', 'cases.create', true],
    'case manager works assistance' => ['Case Manager', 'assistance.update', true],
    'case manager reads patients' => ['Case Manager', 'patients.view', true],
    'case manager cannot edit patients' => ['Case Manager', 'patients.update', false],
    'case manager has no reports' => ['Case Manager', 'reports.view', false],
    'case manager times the queue' => ['Case Manager', 'queue.manage', true],
    'case manager keeps a DAR' => ['Case Manager', 'dar.manage', true],
    'case manager cannot approve assistance' => ['Case Manager', 'assistance.approve', false],
    'processor reads patients' => ['Processor', 'patients.view', true],
    'processor times the queue' => ['Processor', 'queue.manage', true],
    'processor keeps a DAR' => ['Processor', 'dar.manage', true],
    'processor has no cases' => ['Processor', 'cases.view', false],
    'processor has no reports' => ['Processor', 'reports.view', false],
    'processor cannot create patients' => ['Processor', 'patients.create', false],
    'admin manages the library' => ['Admin', 'library.manage', true],
    'head cannot manage the library' => ['Head', 'library.manage', false],
    'supervisor cannot manage the library' => ['Supervisor', 'library.manage', false],
    'case manager cannot manage the library' => ['Case Manager', 'library.manage', false],
    'processor cannot manage the library' => ['Processor', 'library.manage', false],
]);

it('lets an authorized user list roles', function () {
    Sanctum::actingAs(userWithRole('Super Admin'));

    $this->getJson('/api/roles')
        ->assertOk()
        ->assertJsonCount(count(RolesAndPermissionsSeeder::ROLES), 'data');
});

it('forbids listing roles without roles.manage', function () {
    Sanctum::actingAs(userWithRole('Processor'));

    $this->getJson('/api/roles')->assertForbidden();
});

it('lets an admin sync another user\'s roles', function () {
    Sanctum::actingAs(userWithRole('Super Admin'));
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
    Sanctum::actingAs(userWithRole('Super Admin'));
    $target = userWithRole('Processor');

    $this->putJson("/api/users/{$target->id}/roles", ['roles' => ['Nonexistent Role']])
        ->assertUnprocessable()
        ->assertJsonValidationErrorFor('roles.0');
});

it('seeds each default role with its system code', function () {
    expect(Role::pluck('code', 'name')->all())->toBe([
        'Super Admin' => 'super_admin',
        'Admin' => 'admin',
        'Head' => 'head',
        'Supervisor' => 'supervisor',
        'Case Manager' => 'case_manager',
        'Processor' => 'processor',
    ]);
});

it('gives a new role a snake case code unless one is sent', function () {
    Sanctum::actingAs(userWithRole('Super Admin'));

    $this->postJson('/api/roles', ['name' => 'Records Officer'])
        ->assertCreated()
        ->assertJsonPath('data.code', 'records_officer');

    $this->postJson('/api/roles', ['name' => 'Records Clerk', 'code' => 'clerk'])
        ->assertCreated()
        ->assertJsonPath('data.code', 'clerk');

    $this->postJson('/api/roles', ['name' => 'Another', 'code' => 'clerk'])
        ->assertUnprocessable()
        ->assertJsonValidationErrorFor('code');

    $this->postJson('/api/roles', ['name' => 'Bad', 'code' => 'Not Valid'])
        ->assertUnprocessable()
        ->assertJsonValidationErrorFor('code');
});

it('numbers a code that another role already holds', function () {
    expect(Role::create(['name' => 'case manager', 'guard_name' => 'web'])->code)->toBe('case_manager_2');
});

it('keeps a role code fixed once it exists', function () {
    $role = Role::findByName('Case Manager');
    Sanctum::actingAs(userWithRole('Super Admin'));

    $this->putJson("/api/roles/{$role->id}", ['code' => 'renamed'])
        ->assertUnprocessable()
        ->assertJsonValidationErrorFor('code');

    $this->putJson("/api/roles/{$role->id}", ['name' => 'Case Officer'])->assertOk();

    expect($role->fresh()->code)->toBe('case_manager');
});

it('recognises a role by its code after it is renamed', function () {
    $user = userWithRole('Super Admin');
    Role::findByName('Super Admin')->update(['name' => 'Root']);

    expect($user->fresh()->load('roles')->hasRoleCode('super_admin'))->toBeTrue()
        ->and($user->fresh()->can('roles.manage'))->toBeTrue();
});
