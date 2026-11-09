<?php

use App\Models\User;
use App\Support\UmisPayload;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

const UMIS_SESSION_ID = '6f1c2a3e-4b5d-4e6f-8a7b-9c0d1e2f3a4b';

beforeEach(function () {
    config([
        'services.auth_provider' => 'umis',
        'services.umis.base_url' => 'https://umis.test',
        'services.umis.api_key' => 'key-123',
        'services.umis.payload_key' => 'payload-key',
        'services.umis.system_code' => 'MSWD',
        'services.umis.portal_url' => 'https://portal.test',
        'services.umis.recheck_minutes' => 5,
        'services.umis.timeout' => 5,
        'services.umis.role_map' => [],
    ]);

    $this->seed(RolesAndPermissionsSeeder::class);
});

/**
 * Encrypt a reply the way UMIS's EncryptApiResponse middleware does.
 *
 * @param  array<string, mixed>  $data
 * @return array{encrypted: true, payload: string}
 */
function umisEncrypt(array $data, string $key = 'payload-key'): array
{
    $iv = random_bytes(16);
    $cipher = openssl_encrypt(json_encode($data), 'aes-256-cbc', UmisPayload::key($key), OPENSSL_RAW_DATA, $iv);

    return ['encrypted' => true, 'payload' => base64_encode($iv.$cipher)];
}

/**
 * A UMIS auth-with-session-id reply for Ana, a Case Manager in MSWD.
 *
 * @param  array<string, mixed>  $details
 * @param  array<string, mixed>  $permissions
 * @return array<string, mixed>
 */
function umisReply(array $details = [], array $permissions = []): array
{
    return [
        'user_details' => array_merge([
            'employee_profile_id' => 501,
            'employee_id' => '1918091351',
            'name' => 'Ana Reyes ',
            'designation' => 'Social Welfare Officer II',
            'area_assigned' => 'Medical Social Services',
            'employee_details' => ['contact' => ['email_address' => 'ana@zcmc.test']],
        ], $details),
        'permissions' => array_merge([
            'id' => 9,
            'name' => 'MSWD',
            'code' => 'MSWD',
            'roles' => [['id' => 1, 'name' => 'Case Manager']],
            'modules' => [],
        ], $permissions),
        'session' => ['token' => 'umis-access-token'],
        'authorization_pin' => '1234',
    ];
}

/**
 * @param  array<string, mixed>|null  $reply
 */
function fakeUmis(?array $reply = null, int $status = 200, bool $encrypted = true): void
{
    $body = $reply ?? umisReply();

    Http::fake([
        'umis.test/api/auth-with-session-id*' => Http::response($encrypted ? umisEncrypt($body) : $body, $status),
    ]);
}

function handOff($test)
{
    return $test->get('/signing-in/'.UMIS_SESSION_ID);
}

/**
 * A session that came from UMIS and was last confirmed ten minutes ago.
 */
function staleUmisSession($test, User $user)
{
    // The Referer makes Sanctum treat the API call as a cookie-session one.
    return $test->actingAs($user)->withHeader('Referer', 'http://localhost')->withSession([
        'umis_session_id' => UMIS_SESSION_ID,
        'umis_checked_at' => now()->subMinutes(10)->getTimestamp(),
    ]);
}

it('signs in from the portal hand-off and creates the user keyed on the UMIS id', function () {
    fakeUmis();

    handOff($this)->assertRedirect('/');

    $user = User::where('employee_id', 501)->firstOrFail();
    expect($user)
        ->employee_number->toBe(1918091351)
        ->employee_name->toBe('Ana Reyes')
        ->email->toBe('ana@zcmc.test')
        ->position->toBe('Social Welfare Officer II')
        ->placement->toBe('Medical Social Services')
        ->is_active->toBeTrue()
        ->and($user->getRoleNames()->all())->toBe(['Case Manager'])
        ->and(session('umis_session_id'))->toBe(UMIS_SESSION_ID);

    $this->assertAuthenticatedAs($user);
    Http::assertSent(fn (HttpRequest $request) => $request->method() === 'POST'
        && str_starts_with($request->url(), 'https://umis.test/api/auth-with-session-id?')
        && str_contains($request->url(), 'session_id='.UMIS_SESSION_ID)
        && $request->hasHeader('UMIS-Api-Key', 'key-123'));
});

it('reads a reply UMIS did not encrypt', function () {
    fakeUmis(encrypted: false);

    handOff($this)->assertRedirect('/');

    $this->assertAuthenticated();
});

it('refuses clearly when the payload key is wrong', function () {
    config(['services.umis.payload_key' => 'some-other-key']);
    fakeUmis();

    handOff($this)
        ->assertRedirect('/login')
        ->assertSessionHas('auth_error', fn ($m) => str_contains($m, 'could not read'));

    $this->assertGuest();
});

it('decrypts a reply the way UMIS encrypts it', function () {
    expect(UmisPayload::decode(umisEncrypt(['a' => 1], 'k'), 'k'))->toBe(['a' => 1])
        ->and(UmisPayload::decode(['a' => 1], null))->toBe(['a' => 1])
        ->and(fn () => UmisPayload::decode(umisEncrypt(['a' => 1], 'k'), null))
        ->toThrow(RuntimeException::class, 'UMIS_PAYLOAD_KEY');
});

it('updates the same user on the next sign-in instead of adding one', function () {
    User::factory()->create(['employee_id' => 501, 'employee_name' => 'Old Name', 'is_active' => true]);
    fakeUmis();

    handOff($this)->assertRedirect('/');

    expect(User::where('employee_id', 501)->count())->toBe(1)
        ->and(User::where('employee_id', 501)->value('employee_name'))->toBe('Ana Reyes');
});

it('never matches an existing user by email', function () {
    $other = User::factory()->create(['employee_id' => 999, 'email' => 'ana@zcmc.test']);
    fakeUmis();

    handOff($this);

    expect(User::where('employee_id', 501)->exists())->toBeTrue()
        ->and($other->fresh()->employee_id)->toBe(999);
    $this->assertAuthenticatedAs(User::where('employee_id', 501)->first());
});

it('replaces the roles on every sign-in and drops unknown ones', function () {
    $user = User::factory()->create(['employee_id' => 501, 'is_active' => true]);
    $user->assignRole('Supervisor');
    fakeUmis(umisReply(permissions: ['roles' => [['id' => 1, 'name' => 'Case Manager'], ['id' => 2, 'name' => 'Janitor']]]));

    handOff($this);

    expect($user->fresh()->getRoleNames()->all())->toBe(['Case Manager']);
});

it('matches a UMIS role by its system code', function () {
    fakeUmis(umisReply(permissions: ['roles' => [['id' => 1, 'name' => 'processor']]]));

    handOff($this);

    expect(User::where('employee_id', 501)->first()->getRoleNames()->all())->toBe(['Processor']);
});

it('never lets UMIS grant the super admin role', function () {
    fakeUmis(umisReply(permissions: ['roles' => [
        ['id' => 1, 'name' => RolesAndPermissionsSeeder::SUPER_ADMIN],
        ['id' => 2, 'name' => RolesAndPermissionsSeeder::SUPER_ADMIN_CODE],
    ]]));

    handOff($this);

    expect(User::where('employee_id', 501)->first()->getRoleNames()->all())->toBe([]);
});

it('applies the configured role map', function () {
    config(['services.umis.role_map' => ['MSWD Social Worker' => 'case_manager']]);
    fakeUmis(umisReply(permissions: ['roles' => [['id' => 1, 'name' => 'MSWD Social Worker']]]));

    handOff($this);

    expect(User::where('employee_id', 501)->first()->getRoleNames()->all())->toBe(['Case Manager']);
});

it('keeps a sign-in whose UMIS employee number is not a plain number', function () {
    fakeUmis(umisReply(['employee_id' => 'JO-2024-17']));

    handOff($this)->assertRedirect('/');

    expect(User::where('employee_id', 501)->value('employee_number'))->toBeNull();
    $this->assertAuthenticated();
});

it('refuses a hand-off UMIS does not vouch for', function (?array $reply, int $status, string $message) {
    fakeUmis($reply, $status);

    handOff($this)
        ->assertRedirect('/login')
        ->assertSessionHas('auth_error', fn ($m) => str_contains($m, $message));

    $this->assertGuest();
    expect(User::where('employee_id', 501)->exists())->toBeFalse();
})->with([
    'signed out of UMIS' => [['message' => 'unauthorized session id is invalid.'], 401, 'has ended'],
    'UMIS error, e.g. no MSWD role' => [['message' => 'Failed to authenticate.'], 500, 'could not confirm'],
    'unknown API key' => [['message' => 'Unrecognize third party system.'], 404, 'refused'],
    'another system' => [umisReply(permissions: ['code' => 'PRM']), 200, 'not admitted'],
]);

it('says so when UMIS is unreachable', function () {
    Http::fake(fn () => throw new ConnectionException('timed out'));

    handOff($this)
        ->assertRedirect('/login')
        ->assertSessionHas('auth_error', fn ($m) => str_contains($m, 'unreachable'));

    $this->assertGuest();
});

it('refuses an inactive account', function () {
    User::factory()->create(['employee_id' => 501, 'is_active' => false]);
    fakeUmis();

    handOff($this)
        ->assertRedirect('/login')
        ->assertSessionHas('auth_error', fn ($m) => str_contains($m, 'inactive'));

    $this->assertGuest();
});

it('rejects an id that is not a uuid without asking UMIS', function () {
    Http::fake();

    $this->get('/signing-in/not-a-uuid')->assertNotFound();

    Http::assertNothingSent();
});

it('has no hand-off route while IAM is the provider', function () {
    config(['services.auth_provider' => 'iam']);
    Http::fake();

    handOff($this)->assertNotFound();

    Http::assertNothingSent();
});

it('signs out whoever was signed in on a shared terminal and signs in the new person', function () {
    $previous = User::factory()->create(['is_active' => true]);
    fakeUmis();

    $this->actingAs($previous);
    handOff($this)->assertRedirect('/');

    $this->assertAuthenticatedAs(User::where('employee_id', 501)->first());
});

it('leaves a shared terminal signed out when the hand-off fails', function () {
    $previous = User::factory()->create(['is_active' => true]);
    fakeUmis(['message' => 'unauthorized'], 401);

    $this->actingAs($previous);
    handOff($this)->assertRedirect('/login');

    $this->assertGuest();
});

it('leaves a recently confirmed UMIS session alone', function () {
    Http::fake();
    $user = User::factory()->create(['employee_id' => 501, 'is_active' => true]);

    $this->actingAs($user)->withHeader('Referer', 'http://localhost')->withSession([
        'umis_session_id' => UMIS_SESSION_ID,
        'umis_checked_at' => now()->subMinute()->getTimestamp(),
    ])->getJson('/api/me')->assertOk();

    Http::assertNothingSent();
});

it('ends the session once the person signs out of UMIS', function () {
    fakeUmis(['message' => 'unauthorized session id is invalid.'], 401);
    $user = User::factory()->create(['employee_id' => 501, 'is_active' => true]);

    staleUmisSession($this, $user)->getJson('/api/me')->assertUnauthorized();

    expect(session('umis_session_id'))->toBeNull();
});

it('ends the session when UMIS says the person lost MSWD access', function () {
    fakeUmis(umisReply(permissions: ['code' => 'PRM']));
    $user = User::factory()->create(['employee_id' => 501, 'is_active' => true]);

    staleUmisSession($this, $user)->getJson('/api/me')->assertUnauthorized();
});

it('sends a web page back to the login page when the session ends', function () {
    fakeUmis(['message' => 'unauthorized'], 401);
    $user = User::factory()->create(['employee_id' => 501, 'is_active' => true]);
    $user->assignRole('Case Manager');

    staleUmisSession($this, $user)->get('/caseload')->assertRedirect('/login');

    $this->assertGuest();
});

it('keeps the session when UMIS cannot be reached', function () {
    Http::fake(fn () => throw new ConnectionException('timed out'));
    $user = User::factory()->create(['employee_id' => 501, 'is_active' => true]);

    staleUmisSession($this, $user)->getJson('/api/me')->assertOk();

    // Stamped, so the next request does not wait on UMIS again.
    expect(session('umis_checked_at'))->toBeGreaterThan(now()->subMinute()->getTimestamp());
});

it('picks up role changes when it rechecks', function () {
    fakeUmis(umisReply(permissions: ['roles' => [['id' => 3, 'name' => 'Supervisor']]]));
    $user = User::factory()->create(['employee_id' => 501, 'is_active' => true]);
    $user->assignRole('Case Manager');

    staleUmisSession($this, $user)->getJson('/api/me')->assertOk();

    expect($user->fresh()->getRoleNames()->all())->toBe(['Supervisor']);
});

it('ends the session if the UMIS id now names someone else', function () {
    fakeUmis(umisReply(['employee_profile_id' => 777]));
    $user = User::factory()->create(['employee_id' => 501, 'is_active' => true]);

    staleUmisSession($this, $user)->getJson('/api/me')->assertUnauthorized();
});

it('leaves a super admin password session alone', function () {
    Http::fake();
    $admin = User::factory()->create();
    $admin->assignRole(RolesAndPermissionsSeeder::SUPER_ADMIN);

    $this->actingAs($admin)->getJson('/api/me')->assertOk();

    Http::assertNothingSent();
});

it('sends a UMIS session back to the portal on logout', function () {
    fakeUmis();
    handOff($this);

    $this->postJson('/logout')
        ->assertOk()
        ->assertJsonPath('redirect', 'https://portal.test');

    $this->assertGuest();
});

it('just ends a password session on logout', function () {
    $admin = User::factory()->create();
    $admin->assignRole(RolesAndPermissionsSeeder::SUPER_ADMIN);

    $this->actingAs($admin)->postJson('/logout')
        ->assertOk()
        ->assertJsonPath('redirect', null);
});

it('sends guests from the login page to the portal', function () {
    $this->get('/login')->assertRedirect('https://portal.test');
});

it('shows the login page when the portal URL is not set', function () {
    config(['services.umis.portal_url' => null]);

    $this->get('/login')->assertOk();
});

it('shows why a hand-off failed instead of bouncing back to the portal', function () {
    $this->withSession(['auth_error' => 'Denied'])->get('/login')->assertOk();
});
