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

test('the login page sends guests straight to ZCMC IAM', function () {
    $this->get('/login')->assertRedirect(route('iam.redirect'));
});

test('the login page renders for a failed IAM sign-in', function () {
    $this->withSession(['iam_error' => 'Denied'])->get('/login')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Auth/Login')->where('iamError', 'Denied'));
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
