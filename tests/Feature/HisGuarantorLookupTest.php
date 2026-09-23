<?php

use App\Models\Bizbox\DataCenter;
use App\Models\Bizbox\HospitalPatient;
use App\Models\Bizbox\PatientGuarantors;
use App\Models\Bizbox\PatientPersonalData;
use App\Models\Bizbox\PatientTransaction;
use App\Models\User;
use App\Repositories\Contracts\PatientGuarantorRepositoryInterface;
use App\Repositories\Contracts\PatientTransactionRepositoryInterface;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Pagination\LengthAwarePaginator;
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
    $ledger->setRelation('guarantor', $account);

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

    $this->getJson('/api/patient-transactions/9/guarantors')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.id', 1)
        ->assertJsonPath('data.0.transaction_id', 9)
        ->assertJsonPath('data.0.guarantor_details.guarantor_id', 1001)
        ->assertJsonPath('data.0.guarantor_details.guarantor_name', 'Santos, Pedro M')
        ->assertJsonPath('data.1.guarantor_details.guarantor_name', 'Cruz, Maria');
});

it('returns an empty list — not a 404 — when the admission has no guarantor', function () {
    Sanctum::actingAs(hisUser());

    $this->mock(PatientGuarantorRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('forRegistration')->andReturn(new Collection);
    });

    $this->getJson('/api/patient-transactions/9/guarantors')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('refuses a user without patients.view', function () {
    $user = User::factory()->create(['role' => 'Social Worker']);   // no role assigned → no permissions
    Sanctum::actingAs($user);

    $this->getJson('/api/patient-transactions/9/guarantors')->assertForbidden();
});

it('refuses an unauthenticated caller', function () {
    $this->getJson('/api/patient-transactions/9/guarantors')->assertUnauthorized();
});

it('falls back when the guarantor entity carries no name', function () {
    $ledger = (new PatientGuarantors)->forceFill(['PK_TRXNO' => 3]);
    $account = (new DataCenter)->forceFill(['PK_psDatacenter' => 1]);
    $account->setRelation('personalData', null);

    expect($account->displayName())->toBe('Unnamed guarantor');
});

/**
 * A transaction with its patient and guarantors already attached, so the test
 * never reaches the sqlsrv connection.
 */
function fakeTransactionWithGuarantors(int $key = 9, bool $withGuarantors = true): PatientTransaction
{
    $personal = (new PatientPersonalData)->forceFill([
        'firstname' => 'Pedro', 'lastname' => 'Santos', 'middlename' => 'M',
    ]);

    $patient = (new HospitalPatient)->forceFill(['PK_emdPatients' => 5, 'patid' => 777]);
    $patient->setRelation('personalData', $personal);

    $transaction = (new PatientTransaction)->forceFill(['PK_psPatRegisters' => $key]);
    $transaction->setRelation('patient', $patient);

    if ($withGuarantors) {
        $transaction->setRelation('guarantors', new Collection([fakeGuarantor(1, $key, 'Cruz', 'Maria')]));
    }

    return $transaction;
}

it('nests guarantors on a single transaction', function () {
    Sanctum::actingAs(hisUser());

    $this->mock(PatientTransactionRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('find')->andReturn(fakeTransactionWithGuarantors());
    });

    $this->getJson('/api/patient-transactions/9')
        ->assertOk()
        ->assertJsonPath('data.id', 9)
        ->assertJsonCount(1, 'data.patient_guarantors')
        ->assertJsonPath('data.patient_guarantors.0.guarantor_details.guarantor_name', 'Cruz, Maria');
});

it('omits guarantors from the transaction list', function () {
    // Pins the N+1 decision: guarantors are eager-loaded in find() only, so a
    // list row must not carry the key at all. A stray with() would break this.
    Sanctum::actingAs(hisUser());

    $this->mock(PatientTransactionRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('paginate')->andReturn(new LengthAwarePaginator(
            [fakeTransactionWithGuarantors(withGuarantors: false)], 1, 15,
        ));
    });

    $this->getJson('/api/patient-transactions')
        ->assertOk()
        ->assertJsonPath('data.0.id', 9)
        ->assertJsonMissingPath('data.0.patient_guarantors');
});
