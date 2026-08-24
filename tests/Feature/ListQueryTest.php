<?php

use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->other = Sector::create(['name' => 'Surgery', 'code' => 'SUR']);

    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');
    Sanctum::actingAs($this->admin);
});

function listPatient(array $overrides = []): Patient
{
    return Patient::create(array_merge([
        'sector_id' => test()->sector->id,
        'first_name' => 'Juan',
        'last_name' => 'Dela Cruz',
        'sex' => 'male',
    ], $overrides));
}

function listCase(Patient $patient, array $overrides = []): CaseModel
{
    return CaseModel::create(array_merge([
        'patient_id' => $patient->id,
        'assigned_user_id' => test()->admin->id,
        'case_code' => 'CASE-'.$patient->id,
        'case_type' => 'medical',
        'priority_level' => 'low',
        'status' => 'open',
        'admission_type' => 'OPD',
        'date_opened' => now(),
    ], $overrides));
}

it('returns every patient unfiltered', function () {
    listPatient(['last_name' => 'Alpha']);
    listPatient(['last_name' => 'Bravo']);

    $this->getJson('/api/patients')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

it('searches across the declared columns only', function () {
    listPatient(['last_name' => 'Santos', 'first_name' => 'Maria']);
    listPatient(['last_name' => 'Reyes', 'first_name' => 'Pedro']);

    $this->getJson('/api/patients?search=Santos')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.last_name', 'Santos');

    $this->getJson('/api/patients?search=Pedro')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.first_name', 'Pedro');

    // `address` is not declared searchable, so it must not match.
    listPatient(['last_name' => 'Cruz', 'address' => 'Tetuan']);
    $this->getJson('/api/patients?search=Tetuan')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('treats wildcard characters in the search term literally', function () {
    listPatient(['last_name' => 'Santos']);
    listPatient(['last_name' => 'Reyes']);

    // Unescaped, this would match every row.
    $this->getJson('/api/patients?search=%25')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('filters on a declared column and ignores an undeclared one', function () {
    listPatient(['last_name' => 'Medical one']);
    listPatient(['last_name' => 'Surgery one', 'sector_id' => $this->other->id]);

    $this->getJson('/api/patients?filter[sector_id]='.$this->sector->id)
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.last_name', 'Medical one');

    // `address` is not in $filterable, so the filter is dropped, not applied.
    $this->getJson('/api/patients?filter[address]=nowhere')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

it('sorts by a declared column in both directions', function () {
    listPatient(['last_name' => 'Zamora']);
    listPatient(['last_name' => 'Abad']);

    $this->getJson('/api/patients?sort=last_name&direction=asc')
        ->assertOk()
        ->assertJsonPath('data.0.last_name', 'Abad');

    $this->getJson('/api/patients?sort=last_name&direction=desc')
        ->assertOk()
        ->assertJsonPath('data.0.last_name', 'Zamora');
});

it('falls back to the default sort when the sort column is not allow-listed', function () {
    listPatient(['last_name' => 'Zamora']);
    listPatient(['last_name' => 'Abad']);

    // `password` is not sortable, so the default (last_name asc) applies and
    // the requested column never reaches the query.
    $this->getJson('/api/patients?sort=password&direction=desc')
        ->assertOk()
        ->assertJsonPath('data.0.last_name', 'Abad');
});

it('pages through results and reports the totals', function () {
    foreach (range(1, 5) as $i) {
        listPatient(['last_name' => 'Patient '.$i]);
    }

    $this->getJson('/api/patients?per_page=2&page=1')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.current_page', 1)
        ->assertJsonPath('meta.total', 5);

    $second = $this->getJson('/api/patients?per_page=2&page=2')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.current_page', 2);

    expect($second->json('data.0.last_name'))->toBe('Patient 3');
});

it('caps per_page so a client cannot request the whole table', function () {
    listPatient();

    $this->getJson('/api/patients?per_page=100000')
        ->assertOk()
        ->assertJsonPath('meta.per_page', 100);
});

it('excludes archived patients unless asked for them', function () {
    listPatient(['last_name' => 'Active']);
    $archived = listPatient(['last_name' => 'Archived']);
    $archived->delete();

    $this->getJson('/api/patients')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.last_name', 'Active');

    $this->getJson('/api/patients?trashed=with')
        ->assertOk()
        ->assertJsonCount(2, 'data');

    $this->getJson('/api/patients?trashed=only')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.last_name', 'Archived');
});

it('searches cases through the related patient name', function () {
    $santos = listPatient(['last_name' => 'Santos']);
    $reyes = listPatient(['last_name' => 'Reyes']);

    listCase($santos);
    listCase($reyes);

    $this->getJson('/api/cases?search=Santos')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.case_code', 'CASE-'.$santos->id);
});

it('filters cases by status', function () {
    $patient = listPatient();

    listCase($patient, ['case_code' => 'CASE-OPEN', 'status' => 'open']);
    listCase($patient, ['case_code' => 'CASE-CLOSED', 'status' => 'closed']);

    $this->getJson('/api/cases?filter[status]=closed')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.status', 'closed');
});

it('exposes the reference lookups behind authentication', function () {
    $this->getJson('/api/sectors')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'Medical');

    $this->getJson('/api/sectors/'.$this->sector->id)
        ->assertOk()
        ->assertJsonPath('data.code', 'MED');
});

it('rejects the reference lookups without a token', function () {
    app()['auth']->forgetGuards();

    $this->getJson('/api/sectors')->assertUnauthorized();
    $this->getJson('/api/assistant-types')->assertUnauthorized();
    $this->getJson('/api/intervention-types')->assertUnauthorized();
    $this->getJson('/api/guarantors')->assertUnauthorized();
});
