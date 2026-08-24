<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function authUser(array $overrides = []): User
{
    return User::factory()->create(array_merge([
        'email' => 'worker@zcmc.test',
        'password' => Hash::make('secret-pass'),
        'is_active' => true,
    ], $overrides));
}

it('issues a token for valid credentials and returns the user', function () {
    authUser();

    $response = $this->postJson('/api/login', [
        'email' => 'worker@zcmc.test',
        'password' => 'secret-pass',
    ])
        ->assertOk()
        ->assertJsonPath('data.email', 'worker@zcmc.test')
        ->assertJsonPath('token_type', 'Bearer');

    expect($response->json('token'))->not->toBeEmpty();
    $this->assertDatabaseCount('personal_access_tokens', 1);
});

it('names the token from the device_name when provided', function () {
    authUser();

    $this->postJson('/api/login', [
        'email' => 'worker@zcmc.test',
        'password' => 'secret-pass',
        'device_name' => 'React Web',
    ])->assertOk();

    $this->assertDatabaseHas('personal_access_tokens', ['name' => 'React Web']);
});

it('rejects a wrong password without issuing a token', function () {
    authUser();

    $this->postJson('/api/login', [
        'email' => 'worker@zcmc.test',
        'password' => 'wrong',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('email');

    $this->assertDatabaseCount('personal_access_tokens', 0);
});

it('rejects an unknown email with the same generic message', function () {
    $this->postJson('/api/login', [
        'email' => 'nobody@zcmc.test',
        'password' => 'whatever',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('email');
});

it('refuses an inactive account', function () {
    authUser(['is_active' => false]);

    $this->postJson('/api/login', [
        'email' => 'worker@zcmc.test',
        'password' => 'secret-pass',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('email');

    $this->assertDatabaseCount('personal_access_tokens', 0);
});

it('validates that email and password are required', function () {
    $this->postJson('/api/login', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['email', 'password']);
});

it('returns the authenticated user from /api/user with a token', function () {
    $user = authUser();
    Sanctum::actingAs($user);

    $this->getJson('/api/user')->assertOk()->assertJsonPath('email', 'worker@zcmc.test');
});

it('rejects /api/user without a token', function () {
    $this->getJson('/api/user')->assertUnauthorized();
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
