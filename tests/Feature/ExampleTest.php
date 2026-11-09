<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('guests are redirected to the login page', function () {
    $response = $this->get('/');
    $response->assertRedirect('/login');
});

test('under IAM the login page sends guests straight to ZCMC IAM', function () {
    config(['services.auth_provider' => 'iam']);

    $this->get('/login')->assertRedirect(route('iam.redirect'));
});

test('under IAM the login page renders for a failed sign-in', function () {
    config(['services.auth_provider' => 'iam']);

    $this->withSession(['auth_error' => 'Denied'])->get('/login')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Auth/Login')->where('authError', 'Denied'));
});

test('IAM is switched off by default: the login page renders and the IAM routes are gone', function () {
    expect(config('services.auth_provider'))->toBe('umis');
    // With a portal URL set, /login sends guests there instead (UmisAuthTest).
    config(['services.umis.portal_url' => null]);

    $this->get('/login')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Auth/Login')
            ->where('auth.provider', 'umis')
        );

    $this->get('/auth/iam/redirect')->assertNotFound();
    $this->get('/callback?code=abc&state=xyz')->assertNotFound();
});

test('the administrator password form is at /login?admin', function () {
    $this->get('/login?admin')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Auth/Login')->where('adminLogin', true));
});

test('authenticated users can access patients index with Inertia', function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $user = User::factory()->create(['is_active' => true]);
    $user->assignRole('Admin');

    $this->actingAs($user)
        ->get('/')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Patients/Index')
            ->has('auth.user')
        );
});
