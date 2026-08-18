<?php

use App\Filament\Resources\UnifiedIntakeSheets\Pages\CreateUnifiedIntakeSheet;
use App\Models\Bizbox\HospitalPatient;
use App\Models\Bizbox\PatientPersonalData;
use App\Models\Bizbox\PatientRegister;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use App\Repositories\Contracts\PatientRegisterRepositoryInterface;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
});

function hisPanelUser(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function fakeHospitalPatient(int $key = 5, int $patid = 777): HospitalPatient
{
    $personal = (new PatientPersonalData)->forceFill([
        'firstname' => 'Pedro', 'lastname' => 'Santos', 'middlename' => 'M',
        'gender' => 'Male', 'birthdate' => '1975-03-02', 'civilstatus' => 'S',
    ]);

    $hp = (new HospitalPatient)->forceFill(['PK_emdPatients' => $key, 'patid' => $patid]);
    $hp->setRelation('personalData', $personal);

    return $hp;
}

function fakePatientRegister(int $key = 9, ?HospitalPatient $patient = null): PatientRegister
{
    $pr = (new PatientRegister)->forceFill(['PK_psPatRegisters' => $key]);
    $pr->setRelation('patient', $patient ?? fakeHospitalPatient());

    return $pr;
}

it('maps a HIS record onto patient attributes', function () {
    expect(fakeHospitalPatient()->toPatientAttributes())->toMatchArray([
        'hospital_id' => 777,
        'first_name' => 'Pedro',
        'last_name' => 'Santos',
        'middle_name' => 'M',
        'sex' => 'male',
        'birthdate' => '1975-03-02',
        'civil_status' => 'Single',
    ]);
});

it('auto-fills a new intake patient from a hospital (HIS) search', function () {
    actingAs(hisPanelUser());

    $this->mock(PatientRegisterRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('find')->andReturn(fakePatientRegister());
    });

    Livewire::test(CreateUnifiedIntakeSheet::class)
        ->set('data.hospital_patient', 9)                 // pick a HIS registration → prefill
        ->set('data.patient.sector_id', $this->sector->id)
        ->set('data.case', ['case_type' => 'medical', 'priority_level' => 'high', 'admission_type' => 'ER'])
        ->set('data.assessment', ['classification' => 'indigent'])
        ->set('data.date_of_intake', now()->toDateString())
        ->call('create')
        ->assertHasNoFormErrors();

    $patient = Patient::first();
    expect($patient)->not->toBeNull()
        ->and($patient->first_name)->toBe('Pedro')
        ->and($patient->last_name)->toBe('Santos')
        ->and($patient->middle_name)->toBe('M')
        ->and($patient->sex)->toBe('male')
        ->and((int) $patient->hospital_id)->toBe(777);
});
