<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    config([
        'services.iam.base_url' => 'https://iam.test',
        'services.iam.client_id' => 'client-123',
        'services.iam.client_secret' => 'secret-456',
        'services.iam.redirect_uri' => 'http://localhost/callback',
        'services.iam.end_iam_session_on_logout' => true,
        'services.iam.role_map' => [],
    ]);

    $this->seed(RolesAndPermissionsSeeder::class);
});

/**
 * Start a sign-in so the session holds a state and verifier, and return the state.
 */
function startIamSignIn($test): string
{
    $response = $test->get('/auth/iam/redirect');
    $response->assertRedirectContains('https://iam.test/oauth/authorize?');

    parse_str(parse_url($response->headers->get('Location'), PHP_URL_QUERY), $query);

    expect($query)
        ->client_id->toBe('client-123')
        ->redirect_uri->toBe('http://localhost/callback')
        ->response_type->toBe('code')
        ->code_challenge_method->toBe('S256');
    expect($query['code_challenge'])->not->toBeEmpty();

    return $query['state'];
}

function fakeIam(array $claims = [], array $token = []): void
{
    Http::fake([
        'iam.test/oauth/token' => Http::response(array_merge([
            'access_token' => 'access-1',
            'refresh_token' => 'refresh-1',
            'expires_in' => 3600,
        ], $token)),
        'iam.test/api/v1/userinfo' => Http::response(array_merge([
            'sub' => 'sub-1',
            'name' => 'Ana Reyes',
            'email' => 'ana@zcmc.test',
            'placement' => '/mswd',
            'roles' => ['Case Manager'],
            'org_roles' => [['role' => 'oic', 'area' => '/mswd']],
        ], $claims)),
    ]);
}

it('sends the browser to IAM with PKCE and state', function () {
    startIamSignIn($this);
});

it('signs in, creates the user keyed on the IAM subject and syncs mapped roles', function () {
    fakeIam();
    $state = startIamSignIn($this);

    $this->get('/callback?code=abc&state='.$state)->assertRedirect('/');

    $user = User::where('iam_sub', 'sub-1')->firstOrFail();

    $this->assertAuthenticatedAs($user);
    expect($user->employee_name)->toBe('Ana Reyes')
        ->and($user->placement)->toBe('/mswd')
        ->and($user->iam_org_roles)->toBe([['role' => 'oic', 'area' => '/mswd']])
        ->and($user->getRoleNames()->all())->toBe(['Case Manager'])
        ->and($user->is_active)->toBeTrue();

    Http::assertSent(fn ($request) => $request->url() === 'https://iam.test/oauth/token'
        && $request['code'] === 'abc'
        && $request['client_secret'] === 'secret-456'
        && ! empty($request['code_verifier']));
});

it('never matches an existing user by email', function () {
    $existing = User::factory()->create(['email' => 'ana@zcmc.test']);
    fakeIam();
    $state = startIamSignIn($this);

    $this->get('/callback?code=abc&state='.$state);

    expect(User::count())->toBe(2)
        ->and(User::where('iam_sub', 'sub-1')->value('id'))->not->toBe($existing->id);
});

it('replaces the roles on every sign-in and drops unknown ones', function () {
    $user = User::factory()->create(['iam_sub' => 'sub-1']);
    $user->assignRole('Processor');

    fakeIam(['roles' => ['Case Manager', 'Made Up Role']]);
    $state = startIamSignIn($this);
    $this->get('/callback?code=abc&state='.$state);

    expect($user->fresh()->getRoleNames()->all())->toBe(['Case Manager']);
});

it('never lets IAM grant the super admin role', function () {
    fakeIam(['roles' => [RolesAndPermissionsSeeder::SUPER_ADMIN, 'Processor']]);
    $state = startIamSignIn($this);
    $this->get('/callback?code=abc&state='.$state);

    $user = User::where('iam_sub', 'sub-1')->firstOrFail();

    expect($user->getRoleNames()->all())->toBe(['Processor']);
});

it('applies the configured role map', function () {
    config(['services.iam.role_map' => ['mswd-worker' => 'Case Manager']]);
    fakeIam(['roles' => ['mswd-worker']]);
    $state = startIamSignIn($this);
    $this->get('/callback?code=abc&state='.$state);

    expect(User::where('iam_sub', 'sub-1')->firstOrFail()->getRoleNames()->all())
        ->toBe(['Case Manager']);
});

it('rejects a callback whose state does not match', function () {
    fakeIam();
    startIamSignIn($this);

    $this->get('/callback?code=abc&state=forged')
        ->assertRedirect('/login')
        ->assertSessionHas('iam_error');

    $this->assertGuest();
    Http::assertNothingSent();
});

it('shows the reason when IAM refuses the person', function () {
    $this->get('/callback?error=access_denied')
        ->assertRedirect('/login')
        ->assertSessionHas('iam_error', fn ($m) => str_contains($m, 'not admitted'));

    $this->assertGuest();
});

it('refuses an inactive account', function () {
    User::factory()->create(['iam_sub' => 'sub-1', 'is_active' => false]);
    fakeIam();
    $state = startIamSignIn($this);

    $this->get('/callback?code=abc&state='.$state)->assertRedirect('/login');

    $this->assertGuest();
});

it('refuses sign-in when IAM rejects the code exchange', function () {
    Http::fake(['iam.test/oauth/token' => Http::response(['error' => 'invalid_client'], 401)]);
    $state = startIamSignIn($this);

    $this->get('/callback?code=abc&state='.$state)
        ->assertRedirect('/login')
        ->assertSessionHas('iam_error');

    $this->assertGuest();
});

/**
 * An IAM-originated session whose access token dies in 30 seconds.
 */
function nearExpiryIamSession($test)
{
    $user = User::factory()->create(['iam_sub' => 'sub-1']);

    // The Referer is what makes Sanctum treat the API call as a cookie-session
    // one, like the browser's, so the session (and the IAM tokens) are loaded.
    return $test->actingAs($user)->withHeader('Referer', 'http://localhost')->withSession([
        'iam_access_token' => 'access-1',
        'iam_refresh_token' => 'refresh-1',
        'iam_expires_at' => now()->addSeconds(30),
    ]);
}

it('ends the session when the token expires and the refresh is refused', function () {
    Http::fake(['iam.test/oauth/token' => Http::response(['error' => 'invalid_grant'], 400)]);

    nearExpiryIamSession($this)->getJson('/api/me')->assertUnauthorized();

    expect(session('iam_access_token'))->toBeNull();
});

it('renews the token near expiry and keeps the session', function () {
    Http::fake(['iam.test/oauth/token' => Http::response([
        'access_token' => 'access-2',
        'expires_in' => 3600,
    ])]);

    nearExpiryIamSession($this)->getJson('/api/me')->assertSuccessful();

    expect(session('iam_access_token'))->toBe('access-2')
        ->and(session('iam_refresh_token'))->toBe('refresh-1');
    Http::assertSent(fn ($request) => $request['grant_type'] === 'refresh_token'
        && $request['refresh_token'] === 'refresh-1');
});

it('leaves a still-fresh IAM session alone', function () {
    Http::fake();

    $user = User::factory()->create(['iam_sub' => 'sub-1']);
    $this->actingAs($user)->withHeader('Referer', 'http://localhost')
        ->withSession(['iam_expires_at' => now()->addHour()])
        ->getJson('/api/me')->assertSuccessful();

    Http::assertNothingSent();
});

it('leaves a super admin password session alone', function () {
    $admin = User::factory()->create();
    $admin->assignRole(RolesAndPermissionsSeeder::SUPER_ADMIN);

    $this->actingAs($admin)->getJson('/api/me')->assertOk();
    Http::assertNothingSent();
});

it('signs out of IAM too when the session came from IAM', function () {
    fakeIam();
    $state = startIamSignIn($this);
    $this->get('/callback?code=abc&state='.$state);

    $response = $this->postJson('/logout')->assertOk();

    expect($response->json('redirect'))
        ->toStartWith('https://iam.test/oauth/logout?')
        ->toContain('client_id=client-123')
        ->toContain('post_logout_redirect_uri=');
    $this->assertGuest();
});

it('only ends the local session when configured not to end the IAM one', function () {
    config(['services.iam.end_iam_session_on_logout' => false]);
    fakeIam();
    $state = startIamSignIn($this);
    $this->get('/callback?code=abc&state='.$state);

    $this->postJson('/logout')->assertOk()->assertJsonPath('redirect', null);
    $this->assertGuest();
});

it('matches an IAM role by its system code', function () {
    fakeIam(['roles' => ['case_manager', 'super_admin', 'made_up']]);
    $state = startIamSignIn($this);
    $this->get('/callback?code=abc&state='.$state);

    expect(User::where('iam_sub', 'sub-1')->firstOrFail()->getRoleNames()->all())
        ->toBe(['Case Manager']);
});

it('lets IAM grant the client admin role', function () {
    fakeIam(['roles' => ['admin']]);
    $state = startIamSignIn($this);
    $this->get('/callback?code=abc&state='.$state);

    expect(User::where('iam_sub', 'sub-1')->firstOrFail()->getRoleNames()->all())
        ->toBe(['Admin']);
});
