<?php

use App\Filament\Resources\Patients\Pages\CreatePatient;
use App\Filament\Resources\Patients\Pages\ListPatients;
use App\Filament\Resources\Patients\Pages\ViewPatient;
use App\Filament\Resources\Patients\PatientResource;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\PatientId;
use App\Models\Sector;
use App\Models\User;
use App\Services\PatientMergeService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
});

function patientPanelUser(string $role = 'Admin'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function filamentMakePatient(int $sectorId, string $last = 'Reyes', string $first = 'Ana'): Patient
{
    return Patient::create([
        'sector_id' => $sectorId, 'first_name' => $first, 'last_name' => $last, 'sex' => 'female',
    ]);
}

it('creates a patient through the panel and generates an MSWD ID', function () {
    actingAs(patientPanelUser());

    Livewire::test(CreatePatient::class)
        ->fillForm([
            'sector_id' => $this->sector->id,
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'sex' => 'male',
            'birthdate' => '1980-05-01',
        ])
        ->call('create')
        ->assertHasNoFormErrors();

    $patient = Patient::first();
    expect($patient)->not->toBeNull()
        ->and($patient->last_name)->toBe('Dela Cruz')
        ->and($patient->mswd_id)->not->toBeNull();
});

it('archives a patient with no open cases', function () {
    actingAs(patientPanelUser());
    $patient = filamentMakePatient($this->sector->id);

    Livewire::test(ViewPatient::class, ['record' => $patient->getKey()])
        ->callAction('archive');

    expect($patient->fresh()->trashed())->toBeTrue();
});

it('blocks archiving a patient that has an open case', function () {
    $user = patientPanelUser();
    actingAs($user);
    $patient = filamentMakePatient($this->sector->id);
    CaseModel::create([
        'patient_id' => $patient->id, 'assigned_user_id' => $user->id, 'case_code' => 'CASE-OPEN',
        'case_type' => 'medical', 'priority_level' => 'low', 'status' => 'open',
        'admission_type' => 'OPD', 'date_opened' => now(),
    ]);

    Livewire::test(ViewPatient::class, ['record' => $patient->getKey()])
        ->callAction('archive');

    expect($patient->fresh()->trashed())->toBeFalse();
});

it('merges a patient into another, reassigning records', function () {
    actingAs(patientPanelUser());
    $source = filamentMakePatient($this->sector->id, 'Reyes', 'Ana');
    $target = filamentMakePatient($this->sector->id, 'Reyes', 'Ana');
    $source->patientIds()->create(['id_type' => 'philhealth', 'id_number' => 'PH-1']);

    Livewire::test(ViewPatient::class, ['record' => $source->getKey()])
        ->callAction('merge', ['target_id' => $target->id]);

    expect($source->fresh()->trashed())->toBeTrue()
        ->and($target->patientIds()->count())->toBe(1);
});

it('reverses a merge from the panel', function () {
    actingAs(patientPanelUser());
    $source = filamentMakePatient($this->sector->id);
    $target = filamentMakePatient($this->sector->id);
    $source->patientIds()->create(['id_type' => 'philhealth', 'id_number' => 'PH-1']);

    app(PatientMergeService::class)->merge($source->fresh(), $target->fresh());
    expect($source->fresh()->trashed())->toBeTrue();

    Livewire::test(ViewPatient::class, ['record' => $target->getKey()])
        ->callAction('reverseMerge');

    expect(Patient::find($source->id))->not->toBeNull()
        ->and(PatientId::where('patient_id', $source->id)->count())->toBe(1);
});

it('gates the resource on patient permissions', function () {
    actingAs(patientPanelUser('Admin'));
    expect(PatientResource::canViewAny())->toBeTrue()
        ->and(PatientResource::canCreate())->toBeTrue();

    actingAs(User::factory()->create()); // no roles
    expect(PatientResource::canViewAny())->toBeFalse()
        ->and(PatientResource::canCreate())->toBeFalse();
});

it('lists patients for an authorized user', function () {
    actingAs(patientPanelUser());
    filamentMakePatient($this->sector->id);

    Livewire::test(ListPatients::class)->assertOk();
});
