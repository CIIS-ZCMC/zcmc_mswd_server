<?php

use App\Models\Bizbox\DataCenter;
use App\Models\Bizbox\HospitalPatient;
use App\Models\Bizbox\PatientGuarantors;
use App\Models\Bizbox\PatientPersonalData;
use App\Models\Bizbox\PatientTransaction;
use App\Models\User;
use App\Repositories\Contracts\HospitalPatientRepositoryInterface;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

/**
 * A HIS patient with personal data and an optional set of transactions already
 * attached, so the test never touches the sqlsrv connection.
 */
function aggregatePatient(bool $withTransactions = true): HospitalPatient
{
    $personal = (new PatientPersonalData)->forceFill([
        'firstname' => 'Pedro', 'lastname' => 'Santos', 'middlename' => 'M',
        'gender' => 'Male', 'birthdate' => '1980-05-01 00:00:00', 'civilstatus' => 'S',
    ]);

    $patient = (new HospitalPatient)->forceFill(['PK_emdPatients' => 5, 'patid' => 777]);
    $patient->setRelation('personalData', $personal);

    $transactions = new Collection;

    if ($withTransactions) {
        $account = (new DataCenter)->forceFill(['PK_psDatacenter' => 900]);
        $account->setRelation('personalData', (new PatientPersonalData)->forceFill([
            'firstname' => 'Maria', 'lastname' => 'Cruz',
        ]));

        $guarantor = (new PatientGuarantors)->forceFill(['PK_TRXNO' => 1, 'FK_faCustomers' => 900]);
        $guarantor->setRelation('guarantor', $account);

        $transaction = (new PatientTransaction)->forceFill([
            'PK_psPatRegisters' => 9,
            'FK_emdPatients' => 5,
            'registrydate' => '2026-09-14 08:30:00',
        ]);
        $transaction->setRelation('guarantors', new Collection([$guarantor]));

        $transactions->push($transaction);
    }

    $patient->setRelation('transactions', $transactions);

    return $patient;
}

function aggregateUser(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

it('returns personal data and transactions in one payload', function () {
    Sanctum::actingAs(aggregateUser());

    $this->mock(HospitalPatientRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('findWithTransactions')->with('5')->andReturn(aggregatePatient());
    });

    $this->getJson('/api/hospital-patients/5')
        ->assertOk()
        ->assertJsonPath('data.id', 5)
        ->assertJsonPath('data.hospital_number', '777')
        ->assertJsonPath('data.display_name', 'Santos, Pedro M')
        ->assertJsonPath('data.personal_data.first_name', 'Pedro')
        ->assertJsonPath('data.personal_data.last_name', 'Santos')
        ->assertJsonPath('data.personal_data.sex', 'male')
        ->assertJsonPath('data.personal_data.civil_status', 'Single')
        ->assertJsonCount(1, 'data.transactions')
        ->assertJsonPath('data.transactions.0.id', 9)
        ->assertJsonPath('data.transactions.0.patient_guarantors.0.guarantor_details.guarantor_name', 'Cruz, Maria');
});

it('returns an empty transactions array for a patient with no visits', function () {
    Sanctum::actingAs(aggregateUser());

    $this->mock(HospitalPatientRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('findWithTransactions')->andReturn(aggregatePatient(withTransactions: false));
    });

    $this->getJson('/api/hospital-patients/5')
        ->assertOk()
        ->assertJsonPath('data.personal_data.first_name', 'Pedro')
        ->assertJsonCount(0, 'data.transactions');
});

it('404s when the hospital patient does not exist', function () {
    Sanctum::actingAs(aggregateUser());

    $this->mock(HospitalPatientRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('findWithTransactions')->andReturn(null);
    });

    $this->getJson('/api/hospital-patients/404')->assertNotFound();
});

it('refuses a user without patients.view', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'Social Worker']));

    $this->getJson('/api/hospital-patients/5')->assertForbidden();
});

it('refuses an unauthenticated caller', function () {
    $this->getJson('/api/hospital-patients/5')->assertUnauthorized();
});
