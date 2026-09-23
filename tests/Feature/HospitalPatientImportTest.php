<?php

use App\Models\Bizbox\HospitalPatient;
use App\Models\Bizbox\PatientPersonalData;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use App\Repositories\Contracts\HospitalPatientRepositoryInterface;
use App\Services\PatientService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

function importUser(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

/**
 * A HIS patient with personal data attached, so no test touches the sqlsrv
 * connection. Demographics cover the fields the mapper translates.
 */
function hisPatientFixture(int $key = 5, int $patid = 777): HospitalPatient
{
    $personal = (new PatientPersonalData)->forceFill([
        'firstname' => 'Pedro',
        'lastname' => 'Santos',
        'middlename' => 'M',
        'suffixname' => 'Jr',
        'gender' => 'Male',
        'birthdate' => '1975-03-02 00:00:00',
        'birthtime' => '06:30',
        'civilstatus' => 'S',
        'birthplace' => 'Zamboanga City',
        'citizenship' => 'Filipino',
        'nationality' => 'Filipino',
        'occupation' => 'Fisher',
        'empaddress' => '123 Sea St',
        'empemail' => 'pedro@example.com',
        'emptelefax' => '09171234567',
        'deathdate' => null,
        'deathtime' => null,
    ]);

    $hp = (new HospitalPatient)->forceFill(['PK_emdPatients' => $key, 'patid' => $patid]);
    $hp->setRelation('personalData', $personal);

    return $hp;
}

it('imports a HIS patient into a local patient with mapped columns', function () {
    $patient = app(PatientService::class)->storeFromHospitalPatient(hisPatientFixture());

    expect(Patient::count())->toBe(1)
        ->and($patient->hospital_id)->toBe(777)
        ->and($patient->first_name)->toBe('Pedro')
        ->and($patient->last_name)->toBe('Santos')
        ->and($patient->middle_name)->toBe('M')
        ->and($patient->extension_name)->toBe('Jr')
        ->and($patient->sex)->toBe('male')
        ->and($patient->civil_status)->toBe('Single')
        ->and($patient->place_of_birth)->toBe('Zamboanga City')   // was 'birthplace'
        ->and($patient->contact_number)->toBe('09171234567')      // was 'telephone'
        ->and($patient->email)->toBe('pedro@example.com')
        ->and($patient->citizenship)->toBe('Filipino')
        ->and($patient->birthtime)->toBe('06:30')
        ->and($patient->mswd_id)->not->toBeNull()
        ->and($patient->sector_id)->toBeNull();
});

it('applies a supplied sector to the imported patient', function () {
    $sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);

    $patient = app(PatientService::class)->storeFromHospitalPatient(hisPatientFixture(), $sector->id);

    expect($patient->sector_id)->toBe($sector->id);
});

it('updates the same local patient on a second import rather than duplicating', function () {
    $service = app(PatientService::class);

    $first = $service->storeFromHospitalPatient(hisPatientFixture());
    $mswd = $first->mswd_id;

    // HIS record now carries a corrected occupation.
    $updated = hisPatientFixture();
    $updated->personalData->occupation = 'Boat captain';

    $second = $service->storeFromHospitalPatient($updated);

    expect(Patient::count())->toBe(1)
        ->and($second->id)->toBe($first->id)
        ->and($second->occupation)->toBe('Boat captain')
        ->and($second->mswd_id)->toBe($mswd);          // unchanged on update
});

it('restores and refreshes a soft-deleted patient with the same hospital_id', function () {
    $service = app(PatientService::class);

    $first = $service->storeFromHospitalPatient(hisPatientFixture());
    $first->delete();

    $second = $service->storeFromHospitalPatient(hisPatientFixture());

    expect(Patient::count())->toBe(1)
        ->and($second->id)->toBe($first->id)
        ->and($second->trashed())->toBeFalse();
});

it('rejects a HIS record that has no hospital number', function () {
    $hp = (new HospitalPatient)->forceFill(['PK_emdPatients' => 5, 'patid' => null]);
    $hp->setRelation('personalData', (new PatientPersonalData)->forceFill([
        'firstname' => 'Pedro', 'lastname' => 'Santos',
    ]));

    app(PatientService::class)->storeFromHospitalPatient($hp);
})->throws(ValidationException::class);

it('imports through the API, 201 first then 200 on refresh', function () {
    Sanctum::actingAs(importUser());
    $sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);

    $this->mock(HospitalPatientRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('find')->with('5')->andReturn(hisPatientFixture());
    });

    $this->postJson('/api/hospital-patients/5/import', ['sector_id' => $sector->id])
        ->assertCreated()
        ->assertJsonPath('data.hospital_id', 777)
        ->assertJsonPath('data.place_of_birth', 'Zamboanga City');

    $this->postJson('/api/hospital-patients/5/import', ['sector_id' => $sector->id])
        ->assertOk();

    expect(Patient::count())->toBe(1);
});

it('validates sector_id exists on import', function () {
    Sanctum::actingAs(importUser());

    $this->mock(HospitalPatientRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('find')->with('5')->andReturn(hisPatientFixture());
    });

    $this->postJson('/api/hospital-patients/5/import', ['sector_id' => 999999])
        ->assertJsonValidationErrors('sector_id');
});

it('refuses the import to a user without patients.create', function () {
    $user = User::factory()->create(['role' => 'Social Worker']); // no permissions assigned
    Sanctum::actingAs($user);

    $this->postJson('/api/hospital-patients/5/import')->assertForbidden();
});

it('maps birthplace and telephone to their patient columns', function () {
    $attributes = hisPatientFixture()->toPatientAttributes();

    expect($attributes)->toHaveKey('place_of_birth')
        ->and($attributes)->toHaveKey('contact_number')
        ->and($attributes)->not->toHaveKey('birthplace')
        ->and($attributes)->not->toHaveKey('telephone');
});
