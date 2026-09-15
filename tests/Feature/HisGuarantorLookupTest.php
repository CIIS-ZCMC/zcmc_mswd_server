<?php

use App\Models\Bizbox\DataCenter;
use App\Models\Bizbox\PatientGuarantors;
use App\Models\Bizbox\PatientPersonalData;
use App\Models\User;
use App\Repositories\Contracts\PatientGuarantorRepositoryInterface;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

function hisUser(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

/**
 * Build a guarantor ledger row with its psDataCenter entity already attached,
 * so the test never touches the SQL Server connection.
 */
function fakeGuarantor(int $key, int $registrationId, string $last, string $first, string $middle = ''): PatientGuarantors
{
    $personal = (new PatientPersonalData)->forceFill([
        'firstname' => $first, 'lastname' => $last, 'middlename' => $middle,
    ]);

    $account = (new DataCenter)->forceFill(['PK_psDatacenter' => 1000 + $key]);
    $account->setRelation('personalData', $personal);

    $ledger = (new PatientGuarantors)->forceFill([
        'PK_TRXNO' => $key,
        'FK_psPatRegisters' => $registrationId,
        'FK_faCustomers' => 1000 + $key,
    ]);
    $ledger->setRelation('account', $account);

    return $ledger;
}

it('returns every guarantor recorded against a registration', function () {
    Sanctum::actingAs(hisUser());

    $this->mock(PatientGuarantorRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('forRegistration')->with(9)->andReturn(new Collection([
            fakeGuarantor(1, 9, 'Santos', 'Pedro', 'M'),
            fakeGuarantor(2, 9, 'Cruz', 'Maria'),
        ]));
    });

    $this->getJson('/api/patient-registers/9/guarantors')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.id', 1)
        ->assertJsonPath('data.0.registration_id', 9)
        ->assertJsonPath('data.0.guarantor_id', 1001)
        ->assertJsonPath('data.0.guarantor_name', 'Santos, Pedro M')
        ->assertJsonPath('data.1.guarantor_name', 'Cruz, Maria');
});

it('returns an empty list — not a 404 — when the admission has no guarantor', function () {
    Sanctum::actingAs(hisUser());

    $this->mock(PatientGuarantorRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('forRegistration')->andReturn(new Collection);
    });

    $this->getJson('/api/patient-registers/9/guarantors')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('refuses a user without patients.view', function () {
    $user = User::factory()->create(['role' => 'Social Worker']);   // no role assigned → no permissions
    Sanctum::actingAs($user);

    $this->getJson('/api/patient-registers/9/guarantors')->assertForbidden();
});

it('refuses an unauthenticated caller', function () {
    $this->getJson('/api/patient-registers/9/guarantors')->assertUnauthorized();
});

it('falls back when the guarantor entity carries no name', function () {
    $ledger = (new PatientGuarantors)->forceFill(['PK_TRXNO' => 3]);
    $account = (new DataCenter)->forceFill(['PK_psDatacenter' => 1]);
    $account->setRelation('personalData', null);

    expect($account->displayName())->toBe('Unnamed guarantor');
});
