<?php

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

function perModuleRoleUser(string $role): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

it('gates each page on its module', function (string $role, string $url, int $status) {
    actingAs(perModuleRoleUser($role))->get($url)->assertStatus($status);
})->with([
    'processor patients' => ['Processor', '/patients/1', 200],
    'processor caseload' => ['Processor', '/caseload', 403],
    'processor reports' => ['Processor', '/reports/social-cases', 403],
    'processor queue' => ['Processor', '/queue', 200],
    'processor dar' => ['Processor', '/dar', 200],
    'case manager caseload' => ['Case Manager', '/caseload', 200],
    'case manager reports' => ['Case Manager', '/reports/social-cases', 403],
    'supervisor caseload' => ['Supervisor', '/caseload', 403],
    'supervisor reports' => ['Supervisor', '/reports/social-cases', 200],
    'supervisor library' => ['Supervisor', '/library', 403],
    'supervisor audit' => ['Supervisor', '/audit', 403],
    'head reports' => ['Head', '/reports/social-cases', 200],
    'head patients' => ['Head', '/patients/1', 403],
    'head queue' => ['Head', '/queue', 403],
    'head dar' => ['Head', '/dar', 403],
    'head library' => ['Head', '/library', 403],
    'admin library' => ['Admin', '/library', 200],
    'admin caseload' => ['Admin', '/caseload', 200],
    'admin reports' => ['Admin', '/reports/social-cases', 200],
    'admin audit' => ['Admin', '/audit', 200],
]);

it('lands each role on its first module', function (string $role, string $landing) {
    $response = actingAs(perModuleRoleUser($role))->get('/');

    $landing === '/' ? $response->assertOk() : $response->assertRedirect($landing);
})->with([
    'processor' => ['Processor', '/'],
    'supervisor' => ['Supervisor', '/'],
    'case manager' => ['Case Manager', '/'],
    'head' => ['Head', '/reports/social-cases'],
]);

it('moves the old Admin users to a new Super Admin and trims Admin to the client', function () {
    $user = perModuleRoleUser('Admin');
    DB::table('roles')->where('code', 'super_admin')->delete();
    Role::findByName('Admin')->syncPermissions(Permission::all());

    (require database_path('migrations/2026_10_28_000300_split_super_admin_from_admin.php'))->up();

    expect($user->fresh()->hasRole('Super Admin'))->toBeTrue()
        ->and($user->fresh()->hasRole('Admin'))->toBeFalse()
        ->and($user->fresh()->role)->toBe('Super Admin')
        ->and(Role::findByName('Super Admin')->code)->toBe('super_admin')
        ->and(Role::findByName('Super Admin')->permissions)->toHaveCount(Permission::count())
        ->and(Role::findByName('Admin')->hasPermissionTo('panel.access'))->toBeFalse()
        ->and(Role::findByName('Admin')->hasPermissionTo('reports.generate'))->toBeTrue();
});
