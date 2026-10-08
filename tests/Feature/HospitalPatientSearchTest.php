<?php

use App\Models\Bizbox\HospitalPatient;
use App\Models\Bizbox\PatientPersonalData;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use App\Repositories\Contracts\HospitalPatientRepositoryInterface;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
});

function hisSearchUser(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

/**
 * A HIS list row built in-test (no sqlsrv). Personal data is set because the
 * list eager-loads it; transactions are not, matching the repository.
 */
function hisSearchRow(int $key, int $patid): HospitalPatient
{
    $hp = (new HospitalPatient)->forceFill(['PK_emdPatients' => $key, 'patid' => $patid]);
    $hp->setRelation('personalData', (new PatientPersonalData)->forceFill([
        'firstname' => 'Pedro', 'lastname' => 'Santos', 'gender' => 'Male',
    ]));

    return $hp;
}

function mockHisSearchPage(array $rows): void
{
    test()->mock(HospitalPatientRepositoryInterface::class, function ($mock) use ($rows) {
        $mock->shouldReceive('paginate')->andReturn(new LengthAwarePaginator($rows, count($rows), 15));
    });
}

function localPatientFor(int $hospitalId): Patient
{
    return Patient::create([
        'sector_id' => test()->sector->id,
        'hospital_id' => $hospitalId,
        'first_name' => 'Pedro',
        'last_name' => 'Santos',
        'sex' => 'male',
    ]);
}

it('links a HIS row to the registered local patient', function () {
    Sanctum::actingAs(hisSearchUser());
    $local = localPatientFor(777);
    mockHisSearchPage([hisSearchRow(5, 777), hisSearchRow(6, 888)]);

    $this->getJson('/api/hospital-patients?search=santos')
        ->assertOk()
        ->assertJsonPath('data.0.local_patient_id', $local->id)
        ->assertJsonPath('data.1.local_patient_id', null);
});

it('treats a soft-deleted local patient as not registered', function () {
    Sanctum::actingAs(hisSearchUser());
    localPatientFor(777)->delete();
    mockHisSearchPage([hisSearchRow(5, 777)]);

    $this->getJson('/api/hospital-patients?search=santos')
        ->assertOk()
        ->assertJsonPath('data.0.local_patient_id', null);
});

it('keeps list rows lean: personal data, no transactions', function () {
    Sanctum::actingAs(hisSearchUser());
    mockHisSearchPage([hisSearchRow(5, 777)]);

    $this->getJson('/api/hospital-patients?search=santos')
        ->assertOk()
        ->assertJsonPath('data.0.personal_data.first_name', 'Pedro')
        ->assertJsonMissingPath('data.0.transactions');
});

it('resolves registry links in one query whatever the page size', function (int $rows) {
    Sanctum::actingAs(hisSearchUser());
    foreach (range(1, $rows) as $i) {
        localPatientFor(1000 + $i);
    }
    mockHisSearchPage(array_map(fn (int $i) => hisSearchRow($i, 1000 + $i), range(1, $rows)));

    DB::enableQueryLog();
    $this->getJson('/api/hospital-patients')->assertOk()->assertJsonCount($rows, 'data');

    $patientQueries = collect(DB::getQueryLog())
        ->filter(fn (array $query) => str_contains($query['query'], '"patients"'));

    expect($patientQueries)->toHaveCount(1);
})->with([1, 10]);

it('omits local_patient_id outside the search list', function () {
    Sanctum::actingAs(hisSearchUser());
    $row = hisSearchRow(5, 777);
    $row->setRelation('transactions', new Collection);
    $this->mock(HospitalPatientRepositoryInterface::class, function ($mock) use ($row) {
        $mock->shouldReceive('findWithTransactions')->andReturn($row);
    });

    $this->getJson('/api/hospital-patients/5')
        ->assertOk()
        ->assertJsonMissingPath('data.local_patient_id');
});
