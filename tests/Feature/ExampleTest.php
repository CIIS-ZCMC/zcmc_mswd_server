<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('guests are redirected to the login page', function () {
    $response = $this->get('/');
    $response->assertRedirect('/login');
});

test('login page renders with Inertia', function () {
    $this->get('/login')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Auth/Login'));
});

test('authenticated users can access patients index with Inertia', function () {
    $user = User::factory()->create(['is_active' => true]);

    $this->actingAs($user)
        ->get('/')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Patients/Index')
            ->has('auth.user')
        );
});
