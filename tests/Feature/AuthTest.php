<?php

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function authUser(array $overrides = [], string $role = RolesAndPermissionsSeeder::SUPER_ADMIN): User
{
    $user = User::factory()->create(array_merge([
        'email' => 'worker@zcmc.test',
        'employee_number' => 100001,
        'password' => Hash::make('secret-pass'),
        'is_active' => true,
    ], $overrides));

    Role::findOrCreate($role, RolesAndPermissionsSeeder::GUARD);
    $user->assignRole($role);

    return $user;
}

it('logs in via web session and authenticates the user', function () {
    $user = authUser();

    $response = $this->postJson('/login', [
        'employee_number' => 100001,
        'password' => 'secret-pass',
    ])
        ->assertOk()
        ->assertJsonPath('data.employee_number', 100001);

    $this->assertAuthenticatedAs($user);
});

it('rejects invalid credentials on web login', function () {
    authUser();

    $this->postJson('/login', [
        'employee_number' => 100001,
        'password' => 'wrong-pass',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('employee_number');

    $this->assertGuest();
});

it('refuses inactive account on web login', function () {
    authUser(['is_active' => false]);

    $this->postJson('/login', [
        'employee_number' => 100001,
        'password' => 'secret-pass',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('employee_number');

    $this->assertGuest();
});

it('refuses password login for anyone but the super admin', function () {
    authUser([], 'Case Manager');

    $this->postJson('/login', [
        'employee_number' => 100001,
        'password' => 'secret-pass',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('employee_number');

    $this->assertGuest();
});

it('logs out web session', function () {
    $user = authUser();

    $this->actingAs($user)
        ->postJson('/logout')
        ->assertOk()
        ->assertJsonPath('redirect', null);

    $this->assertGuest();
});

it('returns the authenticated user from /api/user with a session', function () {
    $user = authUser();

    $this->actingAs($user, 'web')
        ->getJson('/api/user')
        ->assertOk()
        ->assertJsonPath('employee_number', 100001);
});

it('returns the current user with roles and permissions from /api/me with a session', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $user = authUser([], 'Supervisor');

    $response = $this->actingAs($user, 'web')
        ->getJson('/api/me')
        ->assertOk()
        ->assertJsonPath('data.employee_number', 100001)
        ->assertJsonPath('data.roles', ['Supervisor']);

    expect($response->json('data.permissions'))->not->toBeEmpty();
});

it('rejects /api/me when unauthenticated', function () {
    $this->getJson('/api/me')->assertUnauthorized();
});
