<?php

use App\Enums\RegistryStatus;
use App\Models\Bizbox\PatientTransaction;
use App\Models\User;
use App\Repositories\Contracts\PatientTransactionRepositoryInterface;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

function registryStatusUser(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function transactionWithStatus(?string $status): PatientTransaction
{
    return (new PatientTransaction)->forceFill([
        'PK_psPatRegisters' => 9,
        'FK_emdPatients' => 5,
        'registrydate' => '2026-09-14 08:30:00',
        'registrystatus' => $status,
    ]);
}

dataset('registry_statuses', [
    'active' => ['A', 'Active'],
    'discharge' => ['D', 'Discharge'],
    'cancelled' => ['X', 'Cancelled'],
    'may go home' => ['M', 'May Go Home'],
    'untagged as may go home' => ['U', 'Untagged as May Go Home'],
]);

it('maps each registrystatus code to a code+label object', function (string $code, string $label) {
    Sanctum::actingAs(registryStatusUser());

    $this->mock(PatientTransactionRepositoryInterface::class, function ($mock) use ($code) {
        $mock->shouldReceive('find')->with('9')->andReturn(transactionWithStatus($code));
    });

    $this->getJson('/api/patient-transactions/9')
        ->assertOk()
        ->assertJsonPath('data.registration_status.code', $code)
        ->assertJsonPath('data.registration_status.label', $label);
})->with('registry_statuses');

it('renders registration_status as null when the code is absent or unrecognised', function (?string $status) {
    Sanctum::actingAs(registryStatusUser());

    $this->mock(PatientTransactionRepositoryInterface::class, function ($mock) use ($status) {
        $mock->shouldReceive('find')->with('9')->andReturn(transactionWithStatus($status));
    });

    $this->getJson('/api/patient-transactions/9')
        ->assertOk()
        ->assertJsonPath('data.registration_status', null);
})->with([
    'null' => [null],
    'empty string' => [''],
    'unknown code' => ['Z'],
]);

it('labels each enum case', function () {
    expect(RegistryStatus::Active->label())->toBe('Active')
        ->and(RegistryStatus::Discharge->label())->toBe('Discharge')
        ->and(RegistryStatus::Cancelled->label())->toBe('Cancelled')
        ->and(RegistryStatus::MayGoHome->label())->toBe('May Go Home')
        ->and(RegistryStatus::UntaggedMayGoHome->label())->toBe('Untagged as May Go Home');
});
