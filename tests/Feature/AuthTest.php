<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function authUser(array $overrides = []): User
{
    return User::factory()->create(array_merge([
        'email' => 'worker@zcmc.test',
        'employee_number' => 100001,
        'password' => Hash::make('secret-pass'),
        'is_active' => true,
    ], $overrides));
}

it('issues a token for valid credentials and returns the user', function () {
    authUser();

    $response = $this->postJson('/api/login', [
        'employee_number' => 100001,
        'password' => 'secret-pass',
    ])
        ->assertOk()
        ->assertJsonPath('data.employee_number', 100001)
        ->assertJsonPath('token_type', 'Bearer');

    expect($response->json('token'))->not->toBeEmpty();
    $this->assertDatabaseCount('personal_access_tokens', 1);
});

it('names the token from the device_name when provided', function () {
    authUser();

    $this->postJson('/api/login', [
        'employee_number' => 100001,
        'password' => 'secret-pass',
        'device_name' => 'React Web',
    ])->assertOk();

    $this->assertDatabaseHas('personal_access_tokens', ['name' => 'React Web']);
});

it('rejects a wrong password without issuing a token', function () {
    authUser();

    $this->postJson('/api/login', [
        'employee_number' => 100001,
        'password' => 'wrong',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('employee_number');

    $this->assertDatabaseCount('personal_access_tokens', 0);
});

it('rejects an unknown employee number with the same generic message', function () {
    $this->postJson('/api/login', [
        'employee_number' => 999999,
        'password' => 'whatever',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('employee_number');
});

it('refuses an inactive account', function () {
    authUser(['is_active' => false]);

    $this->postJson('/api/login', [
        'employee_number' => 100001,
        'password' => 'secret-pass',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('employee_number');

    $this->assertDatabaseCount('personal_access_tokens', 0);
});

it('validates that employee_number and password are required', function () {
    $this->postJson('/api/login', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['employee_number', 'password']);
});

it('returns the authenticated user from /api/user with a token', function () {
    $user = authUser();
    Sanctum::actingAs($user);

    $this->getJson('/api/user')->assertOk()->assertJsonPath('employee_number', 100001);
});

it('rejects /api/user without a token', function () {
    $this->getJson('/api/user')->assertUnauthorized();
});

it('never exposes the password hash on /api/user', function () {
    Sanctum::actingAs(authUser());

    $this->getJson('/api/user')
        ->assertOk()
        ->assertJsonMissingPath('password')
        ->assertJsonMissingPath('remember_token');
});

it('returns the current user with roles and permissions from /api/me', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $user = authUser();
    $user->assignRole('Supervisor');

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/me')
        ->assertOk()
        ->assertJsonPath('data.employee_number', 100001)
        ->assertJsonPath('data.roles', ['Supervisor']);

    expect($response->json('data.permissions'))->not->toBeEmpty();
});

it('rejects /api/me without a token', function () {
    $this->getJson('/api/me')->assertUnauthorized();
});

it('revokes the current token on logout', function () {
    $user = authUser();
    $token = $user->createToken('api')->plainTextToken;

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/logout')
        ->assertNoContent();

    // Token is revoked (deleted), so it can no longer authenticate a request.
    $this->assertDatabaseCount('personal_access_tokens', 0);
});
