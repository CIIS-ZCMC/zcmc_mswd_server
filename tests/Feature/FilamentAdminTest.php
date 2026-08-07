<?php

use App\Filament\Resources\Users\Pages\EditUser;
use App\Filament\Resources\Users\UserResource;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;

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

it('treats Admin as the super admin role', function () {
    expect(RolesAndPermissionsSeeder::SUPER_ADMIN)->toBe('Admin');
});

it('lets an active user with panel.access reach the panel', function () {
    actingAs(panelUser('Admin'));

    $this->get('/admin')->assertOk();
});

it('denies panel access to a role without panel.access', function () {
    actingAs(panelUser('Processor'));

    $this->get('/admin')->assertForbidden();
});

it('denies panel access to an inactive user who otherwise qualifies', function () {
    actingAs(panelUser('Admin', active: false));

    $this->get('/admin')->assertForbidden();
});

it('shows the users list to a role with users.view', function () {
    actingAs(panelUser('MSS Head')); // has panel.access + users.view

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
    actingAs(panelUser('Admin'));
    $target = panelUser('Processor');
    $caseManagerId = Role::findByName('Case Manager')->getKey();

    Livewire::test(EditUser::class, ['record' => $target->getKey()])
        ->fillForm(['roles' => [$caseManagerId]])
        ->call('save')
        ->assertHasNoFormErrors();

    $target->refresh();

    expect($target->hasRole('Case Manager'))->toBeTrue()
        ->and($target->hasRole('Processor'))->toBeFalse()
        ->and($target->role)->toBe('Case Manager');
});

it('does not allow creating users through the panel', function () {
    expect(UserResource::canCreate())->toBeFalse();
});
