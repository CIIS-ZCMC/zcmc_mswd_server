<?php

use App\Enums\AuthProvider;
use App\Filament\Resources\Users\Pages\CreateUser;
use App\Filament\Resources\Users\Pages\EditUser;
use App\Filament\Resources\Users\UserResource;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Livewire\Livewire;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    config([
        'services.auth_provider' => 'local',
        // Set, to prove /login ignores it under `local`.
        'services.umis.portal_url' => 'https://portal.zcmc.test',
    ]);
});

function localSuperAdmin(): User
{
    $user = User::factory()->create(['is_active' => true]);
    $user->assignRole(RolesAndPermissionsSeeder::SUPER_ADMIN);

    return $user;
}

it('reads the provider from config and refuses an unknown value', function () {
    expect(AuthProvider::current())->toBe(AuthProvider::Local);

    config(['services.auth_provider' => ' IAM ']);
    expect(AuthProvider::current())->toBe(AuthProvider::Iam);

    config(['services.auth_provider' => 'umsi']);
    AuthProvider::current();
})->throws(RuntimeException::class, 'AUTH_PROVIDER must be one of umis, iam, local; got "umsi".');

it('renders the password form at /login without redirecting anywhere', function () {
    $this->get('/login')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Auth/Login')
            ->where('adminLogin', true)
            ->where('auth.provider', 'local')
        );
});

it('hides the UMIS and IAM sign-in routes', function () {
    $this->get('/auth/iam/redirect')->assertNotFound();
    $this->get('/callback?code=abc&state=xyz')->assertNotFound();
    $this->get('/signing-in/9b2f3c1e-6a7d-4e8f-9a0b-1c2d3e4f5a6b')->assertNotFound();
});

it('logs a password session out without sending the browser anywhere', function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $user = User::factory()->create(['is_active' => true]);
    $user->assignRole('Processor');

    actingAs($user)->postJson('/logout')
        ->assertOk()
        ->assertJsonPath('redirect', null);

    $this->assertGuest();
});

describe('the Filament user editor', function () {
    beforeEach(function () {
        $this->seed(RolesAndPermissionsSeeder::class);
        actingAs(localSuperAdmin());
    });

    it('creates an account that can then sign in by password', function () {
        expect(UserResource::canCreate())->toBeTrue();
        $this->get('/admin/users/create')->assertOk();

        Livewire::test(CreateUser::class)
            ->fillForm([
                'employee_name' => 'Maria Santos',
                'employee_number' => 4321,
                'email' => 'maria@zcmc.test',
                'password' => 'Correct-Horse-9',
                'password_confirmation' => 'Correct-Horse-9',
                'roles' => [Role::findByName('Processor')->getKey()],
                'is_active' => true,
            ])
            ->call('create')
            ->assertHasNoFormErrors();

        $user = User::where('employee_number', 4321)->sole();

        expect($user->employee_name)->toBe('Maria Santos')
            ->and($user->role)->toBe('Processor')
            ->and($user->password)->not->toBe('Correct-Horse-9')
            ->and(Hash::check('Correct-Horse-9', $user->password))->toBeTrue();

        auth()->logout();
        $this->postJson('/login', ['employee_number' => 4321, 'password' => 'Correct-Horse-9'])
            ->assertOk();
        $this->assertAuthenticatedAs($user);
    });

    it('requires a password, its confirmation and a unique employee number', function () {
        User::factory()->create(['employee_number' => 4321]);

        Livewire::test(CreateUser::class)
            ->fillForm([
                'employee_name' => 'Maria Santos',
                'employee_number' => 4321,
                'email' => 'maria@zcmc.test',
                'password' => 'Correct-Horse-9',
                'password_confirmation' => 'Wrong-Horse-9',
            ])
            ->call('create')
            ->assertHasFormErrors(['employee_number' => 'unique', 'password' => 'same']);

        Livewire::test(CreateUser::class)
            ->fillForm([
                'employee_name' => 'Maria Santos',
                'employee_number' => 5555,
                'email' => 'maria@zcmc.test',
            ])
            ->call('create')
            ->assertHasFormErrors(['password' => 'required']);
    });

    it('keeps the password when the field is left blank on edit', function () {
        $target = User::factory()->create(['password' => Hash::make('Old-Password-1')]);

        Livewire::test(EditUser::class, ['record' => $target->getKey()])
            ->fillForm(['position' => 'Social Welfare Officer II'])
            ->call('save')
            ->assertHasNoFormErrors();

        $target->refresh();
        expect($target->position)->toBe('Social Welfare Officer II')
            ->and(Hash::check('Old-Password-1', $target->password))->toBeTrue();
    });

    it('resets a password and signs the user out everywhere else', function () {
        $target = User::factory()->create(['password' => Hash::make('Old-Password-1')]);
        $target->createToken('phone');
        DB::table('sessions')->insert([
            'id' => 'other-session',
            'user_id' => $target->getKey(),
            'payload' => '',
            'last_activity' => now()->timestamp,
        ]);
        config(['session.driver' => 'database']);

        Livewire::test(EditUser::class, ['record' => $target->getKey()])
            ->fillForm([
                'password' => 'New-Password-2',
                'password_confirmation' => 'New-Password-2',
            ])
            ->call('save')
            ->assertHasNoFormErrors();

        $target->refresh();
        expect(Hash::check('New-Password-2', $target->password))->toBeTrue()
            ->and($target->tokens()->count())->toBe(0)
            ->and(DB::table('sessions')->where('user_id', $target->getKey())->exists())->toBeFalse();
    });
});
