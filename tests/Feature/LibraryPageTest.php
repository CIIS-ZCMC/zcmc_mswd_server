<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

function libraryPageUser(string $role): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

it('renders the Library page for anyone with library.manage', function (string $role) {
    actingAs(libraryPageUser($role))
        ->get('/library')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Library/Index'));
})->with(['Admin', 'MSS Head', 'Supervisor']);

it('keeps the Library page away from everyone else', function (string $role) {
    actingAs(libraryPageUser($role))->get('/library')->assertForbidden();
})->with(['Case Manager', 'Processor']);

it('sends a signed-out visitor to the login page', function () {
    $this->get('/library')->assertRedirect('/login');
});

it('shares library.manage with the client so the sidebar can show the link', function () {
    actingAs(libraryPageUser('Supervisor'))
        ->get('/library')
        ->assertInertia(fn (Assert $page) => $page->where('auth.permissions', fn ($permissions) => collect($permissions)->contains('library.manage')));
});
