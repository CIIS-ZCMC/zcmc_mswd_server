<?php

use App\Models\Bizbox\HospitalPatient;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use App\Services\PatientService;
use App\Support\PsgcAddress;
use Database\Seeders\PsgcFixtureSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PsgcFixtureSeeder::class);
});

// ── Lookup API ───────────────────────────────────────────────────────────────

it('finds cities by name or province, home region first, only those with barangays', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->getJson('/api/psgc/cities?search=zamb')
        ->assertOk()
        ->assertJsonPath('data.0.code', PsgcFixtureSeeder::ZAMBOANGA_CITY)
        ->assertJsonPath('data.0.province', null)
        ->assertJsonPath('data.0.region.name', 'Region IX (Zamboanga Peninsula)')
        // Aurora matches through its province, Zamboanga del Sur.
        ->assertJsonPath('data.1.code', PsgcFixtureSeeder::AURORA)
        ->assertJsonPath('data.1.province.name', 'Zamboanga del Sur');

    // The City of Manila has no barangays of its own; its districts do.
    $manila = $this->getJson('/api/psgc/cities?search=manila')->assertOk();
    expect($manila->json('data.*.code'))->toBe([PsgcFixtureSeeder::TONDO])
        ->and($manila->json('data.0.label'))->toBe('Tondo I/II, City of Manila');

    $this->getJson('/api/psgc/cities?code='.PsgcFixtureSeeder::AURORA)
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

it('lists the barangays of a city', function () {
    Sanctum::actingAs(User::factory()->create());

    expect($this->getJson('/api/psgc/cities/'.PsgcFixtureSeeder::ZAMBOANGA_CITY.'/barangays')->assertOk()->json('data.*.name'))
        ->toBe(['Arena Blanco', 'Ayala', 'Baliwasan']);

    $this->getJson('/api/psgc/cities/'.PsgcFixtureSeeder::REGION_IX.'/barangays')->assertNotFound();
});

it('keeps the lookups behind sign-in', function () {
    $this->getJson('/api/psgc/cities?search=zamb')->assertUnauthorized();
    $this->getJson('/api/psgc/cities/'.PsgcFixtureSeeder::ZAMBOANGA_CITY.'/barangays')->assertUnauthorized();
});

// ── Composing an address ─────────────────────────────────────────────────────

it('composes an address and fills in the region and province', function () {
    $inProvince = PsgcAddress::resolve(' 123 Rizal St. ', PsgcFixtureSeeder::AURORA, PsgcFixtureSeeder::AURORA_POBLACION);

    expect($inProvince->display())->toBe('123 Rizal St., Poblacion, Aurora, Zamboanga del Sur')
        ->and($inProvince->columns('address'))->toBe([
            'address' => '123 Rizal St., Poblacion, Aurora, Zamboanga del Sur',
            'address_line' => '123 Rizal St.',
            'address_region_code' => PsgcFixtureSeeder::REGION_IX,
            'address_province_code' => PsgcFixtureSeeder::ZAMBOANGA_DEL_SUR,
            'address_city_code' => PsgcFixtureSeeder::AURORA,
            'address_barangay_code' => PsgcFixtureSeeder::AURORA_POBLACION,
        ]);

    expect(PsgcAddress::resolve(null, PsgcFixtureSeeder::ZAMBOANGA_CITY, PsgcFixtureSeeder::AYALA)->display())
        ->toBe('Ayala, City of Zamboanga')
        ->and(PsgcAddress::resolve('', PsgcFixtureSeeder::TONDO, PsgcFixtureSeeder::TONDO_BARANGAY_1)->display())
        ->toBe('Barangay 1, Tondo I/II, City of Manila');
});

it('refuses a barangay of another city', function () {
    PsgcAddress::resolve(null, PsgcFixtureSeeder::ZAMBOANGA_CITY, PsgcFixtureSeeder::AURORA_POBLACION);
})->throws(InvalidArgumentException::class);

// ── Patient addresses ────────────────────────────────────────────────────────

function psgcPatientEditor(): User
{
    test()->seed(RolesAndPermissionsSeeder::class);
    $user = User::factory()->create();
    $user->assignRole('Admin');

    return $user;
}

function psgcPatient(array $attributes = []): Patient
{
    return Patient::create([
        'sector_id' => Sector::firstOrCreate(['code' => 'MED'], ['name' => 'Medical'])->id,
        'mswd_id' => random_int(1000, 999999),
        'first_name' => 'Juan',
        'last_name' => 'Dela Cruz',
        'sex' => 'male',
        ...$attributes,
    ]);
}

it('saves the present and permanent addresses and the place of birth from PSGC', function () {
    Sanctum::actingAs(psgcPatientEditor());
    $patient = psgcPatient(['address' => 'Old text', 'permanent_address' => 'Old permanent']);

    $this->putJson("/api/patients/{$patient->id}", [
        ...psgcAddress('present_address', 'Purok 2', PsgcFixtureSeeder::AYALA),
        ...psgcAddress('permanent_address', null, PsgcFixtureSeeder::AURORA_POBLACION, PsgcFixtureSeeder::AURORA),
        'place_of_birth_city_code' => PsgcFixtureSeeder::AURORA,
    ])
        ->assertOk()
        ->assertJsonPath('data.present_address', 'Purok 2, Ayala, City of Zamboanga')
        ->assertJsonPath('data.present_address_barangay_code', PsgcFixtureSeeder::AYALA)
        ->assertJsonPath('data.permanent_address', 'Poblacion, Aurora, Zamboanga del Sur')
        ->assertJsonPath('data.permanent_address_province_code', PsgcFixtureSeeder::ZAMBOANGA_DEL_SUR)
        ->assertJsonPath('data.place_of_birth', 'Aurora, Zamboanga del Sur');

    // The older residence columns follow the present address, for the PDFs
    // and the registry search.
    expect($patient->fresh()->only(['address', 'barangay', 'municipality', 'province']))->toBe([
        'address' => 'Purok 2',
        'barangay' => 'Ayala',
        'municipality' => 'City of Zamboanga',
        'province' => null,
    ]);

    // An update that does not send an address leaves it alone.
    $this->putJson("/api/patients/{$patient->id}", ['religion' => 'Roman Catholic'])->assertOk();
    expect($patient->fresh()->present_address)->toBe('Purok 2, Ayala, City of Zamboanga');

    // Sent with no city or barangay, it is cleared.
    $this->putJson("/api/patients/{$patient->id}", ['present_address_city_code' => null, 'present_address_barangay_code' => null])->assertOk();
    expect($patient->fresh()->only(['present_address', 'present_address_city_code', 'barangay']))
        ->toBe(['present_address' => null, 'present_address_city_code' => null, 'barangay' => null]);
});

it('needs a city and one of its barangays once an address is given', function () {
    Sanctum::actingAs(psgcPatientEditor());
    $patient = psgcPatient();

    $this->putJson("/api/patients/{$patient->id}", ['present_address_line' => 'Purok 2'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['present_address_city_code']);

    $this->putJson("/api/patients/{$patient->id}", psgcAddress('present_address', 'Purok 2', PsgcFixtureSeeder::AURORA_POBLACION))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['present_address_barangay_code']);

    $this->putJson("/api/patients/{$patient->id}", ['place_of_birth_city_code' => PsgcFixtureSeeder::REGION_IX])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['place_of_birth_city_code']);
});

it('keeps a PSGC permanent address and place of birth when HIS text comes in', function () {
    $patient = psgcPatient(['hospital_id' => 4242]);
    $patient->update(PatientService::addressColumns([
        ...psgcAddress('permanent_address', null, PsgcFixtureSeeder::AYALA),
        'place_of_birth_city_code' => PsgcFixtureSeeder::AURORA,
    ]));

    $his = Mockery::mock(HospitalPatient::class);
    $his->shouldReceive('toPatientAttributes')->andReturn([
        'hospital_id' => 4242,
        'first_name' => 'Juan',
        'permanent_address' => 'HIS free text',
        'place_of_birth' => 'Somewhere',
    ]);

    app(PatientService::class)->storeFromHospitalPatient($his);

    expect($patient->fresh()->only(['permanent_address', 'place_of_birth']))->toBe([
        'permanent_address' => 'Ayala, City of Zamboanga',
        'place_of_birth' => 'Aurora, Zamboanga del Sur',
    ]);

    // Without PSGC codes, HIS text still fills the field as before.
    $other = psgcPatient(['hospital_id' => 4343]);
    $his2 = Mockery::mock(HospitalPatient::class);
    $his2->shouldReceive('toPatientAttributes')->andReturn(['hospital_id' => 4343, 'permanent_address' => 'HIS free text']);
    app(PatientService::class)->storeFromHospitalPatient($his2);

    expect($other->fresh()->permanent_address)->toBe('HIS free text');
});
