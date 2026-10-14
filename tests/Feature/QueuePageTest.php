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

function queueTestUser(string $role): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

it('renders the Queue page for users with queue.manage', function (string $role) {
    actingAs(queueTestUser($role))
        ->get('/queue')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Queue/Index'));
})->with(['Admin', 'MSS Head', 'Supervisor', 'Case Manager', 'Processor']);

it('forbids users without queue.manage from accessing the queue page', function () {
    $user = User::factory()->create();
    actingAs($user)->get('/queue')->assertForbidden();
});

it('redirects unauthenticated users accessing /queue to the login page', function () {
    $this->get('/queue')->assertRedirect('/login');
});

it('renders the Turnaround reports page for users with reports.view', function (string $role) {
    actingAs(queueTestUser($role))
        ->get('/reports/turnaround')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Reports/Turnaround'));
})->with(['Admin', 'MSS Head', 'Supervisor', 'Case Manager', 'Processor']);

it('forbids users without reports.view from accessing turnaround reports', function () {
    $user = User::factory()->create();
    actingAs($user)->get('/reports/turnaround')->assertForbidden();
});

it('redirects unauthenticated users accessing /reports/turnaround to the login page', function () {
    $this->get('/reports/turnaround')->assertRedirect('/login');
});
