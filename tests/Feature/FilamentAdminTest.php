<?php

use App\Filament\Resources\Users\Pages\EditUser;
use App\Filament\Resources\Users\UserResource;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

function panelUser(string $role, bool $active = true): User
{
    $user = User::factory()->create(['role' => $role, 'is_active' => $active]);
    $user->assignRole($role);
    $user->syncRoleCache();

    return $user;
}

it('adds panel.access to the seeded catalog', function () {
    expect(Permission::where('name', 'panel.access')->exists())->toBeTrue();
});

it('makes System Administrator the Shield super admin', function () {
    expect(config('filament-shield.super_admin.name'))->toBe('System Administrator');
});

it('lets an active user with panel.access reach the panel', function () {
    actingAs(panelUser('System Administrator'));

    $this->get('/admin')->assertOk();
});

it('denies panel access to a role without panel.access', function () {
    actingAs(panelUser('Viewer'));

    $this->get('/admin')->assertForbidden();
});

it('denies panel access to an inactive user who otherwise qualifies', function () {
    actingAs(panelUser('System Administrator', active: false));

    $this->get('/admin')->assertForbidden();
});

it('shows the users list to a role with users.view', function () {
    actingAs(panelUser('MSWD Head')); // has panel.access + users.view

    $this->get('/admin/users')->assertOk();
});

it('hides the users list from a panel user without users.view', function () {
    // A bare role that can enter the panel but cannot view users.
    $role = Role::create(['name' => 'Kiosk', 'guard_name' => config('auth.defaults.guard')]);
    $role->givePermissionTo('panel.access');
    actingAs(panelUser('Kiosk'));

    $this->get('/admin/users')->assertForbidden();
});

it('syncs the role cache when roles are changed via the Filament editor', function () {
    actingAs(panelUser('System Administrator'));
    $target = panelUser('Encoder');
    $socialWorkerId = Role::findByName('Social Worker')->getKey();

    Livewire::test(EditUser::class, ['record' => $target->getKey()])
        ->fillForm(['roles' => [$socialWorkerId]])
        ->call('save')
        ->assertHasNoFormErrors();

    $target->refresh();

    expect($target->hasRole('Social Worker'))->toBeTrue()
        ->and($target->hasRole('Encoder'))->toBeFalse()
        ->and($target->role)->toBe('Social Worker');
});

it('does not allow creating users through the panel', function () {
    expect(UserResource::canCreate())->toBeFalse();
});
