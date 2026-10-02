<?php

use App\Models\Assessment;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\PatientFamilyMember;
use App\Models\Sector;
use App\Models\UisPrintLog;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->worker = User::factory()->create(['role' => 'MSS Head']);
    $this->worker->assignRole('MSS Head');

    $sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create([
        'sector_id' => $sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
});

function uisCase(Patient $patient, User $worker, string $code, array $overrides = []): CaseModel
{
    return CaseModel::create(array_merge([
        'patient_id' => $patient->id, 'assigned_user_id' => $worker->id,
        'case_code' => $code, 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'OPD', 'date_opened' => now(),
    ], $overrides));
}

it('lists every case of the patient with its UIS state, newest first', function () {
    Sanctum::actingAs($this->worker);
    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Pedro']);

    $older = uisCase($this->patient, $this->worker, 'CASE-OLD', [
        'date_opened' => now()->subDays(10), 'transaction_id' => 111, 'transaction_type' => 'Outpatient Consultation',
    ]);
    $newer = uisCase($this->patient, $this->worker, 'CASE-NEW', ['date_opened' => now()]);

    $assessment = Assessment::create([
        'case_id' => $older->id, 'created_by' => $this->worker->id, 'classification' => 'C2',
        'total_family_income' => 4500, 'informant_name' => 'Maria', 'presenting_problem' => 'Meds',
        'recommendation' => 'Assist',
    ]);
    $assessment->expenses()->create(['expense_type' => 'Food', 'amount' => 1000]);
    UisPrintLog::create([
        'case_id' => $older->id, 'patient_id' => $this->patient->id, 'printed_by' => $this->worker->id,
        'printed_at' => '2026-09-01 08:00:00',
    ]);

    $data = $this->getJson("/api/patients/{$this->patient->id}/uis")->assertOk()->json('data');

    expect($data)->toHaveCount(2)
        ->and($data[0]['case']['case_code'])->toBe('CASE-NEW')
        ->and($data[0]['uis']['has_assessment'])->toBeFalse()
        ->and($data[0]['uis']['missing'])->toBe(['assessment'])
        ->and($data[0]['uis']['assessment'])->toBeNull()
        ->and($data[1]['case']['transaction_type'])->toBe('Outpatient Consultation')
        ->and($data[1]['uis']['has_assessment'])->toBeTrue()
        ->and($data[1]['uis']['ready'])->toBeTrue()
        ->and($data[1]['uis']['print_count'])->toBe(1)
        ->and($data[1]['uis']['last_printed_at'])->not->toBeNull()
        ->and($data[1]['uis']['classification']['classification'])->toBe('C2')
        ->and($data[1]['uis']['assessment']['id'])->toBe($assessment->id)
        ->and($data[1]['uis']['assessment']['expenses'])->toHaveCount(1)
        ->and($data[1]['uis']['has_social_case'])->toBeFalse();
});

it('does not treat the social case study as the intake assessment', function () {
    Sanctum::actingAs($this->worker);
    $case = uisCase($this->patient, $this->worker, 'CASE-SCSR');
    Assessment::create([
        'case_id' => $case->id, 'created_by' => $this->worker->id, 'classification' => 'B',
        'social_case_status' => Assessment::SOCIAL_CASE_DRAFT,
    ]);

    $row = $this->getJson("/api/patients/{$this->patient->id}/uis")->assertOk()->json('data.0');

    expect($row['uis']['has_assessment'])->toBeFalse()
        ->and($row['uis']['has_social_case'])->toBeTrue()
        ->and($row['uis']['assessment'])->toBeNull();
});

it('picks the newest intake assessment when a case has several', function () {
    Sanctum::actingAs($this->worker);
    $case = uisCase($this->patient, $this->worker, 'CASE-RE');
    Assessment::create(['case_id' => $case->id, 'created_by' => $this->worker->id, 'classification' => 'B']);
    $latest = Assessment::create(['case_id' => $case->id, 'created_by' => $this->worker->id, 'classification' => 'C1']);

    $this->getJson("/api/patients/{$this->patient->id}/uis")
        ->assertJsonPath('data.0.uis.assessment.id', $latest->id);
});

it('only returns the requested patient\'s cases', function () {
    Sanctum::actingAs($this->worker);
    $other = Patient::create(['sector_id' => $this->patient->sector_id, 'first_name' => 'B', 'last_name' => 'C', 'sex' => 'male']);
    uisCase($other, $this->worker, 'CASE-OTHER');

    $this->getJson("/api/patients/{$this->patient->id}/uis")->assertOk()->assertJsonCount(0, 'data');
});

it('does not query once per case', function () {
    Sanctum::actingAs($this->worker);
    foreach (range(1, 6) as $i) {
        $case = uisCase($this->patient, $this->worker, "CASE-N{$i}");
        $a = Assessment::create(['case_id' => $case->id, 'created_by' => $this->worker->id, 'classification' => 'B', 'total_family_income' => 1]);
        $a->expenses()->create(['expense_type' => 'Food', 'amount' => 1]);
    }

    DB::enableQueryLog();
    $this->getJson("/api/patients/{$this->patient->id}/uis")->assertOk()->assertJsonCount(6, 'data');
    $queries = count(DB::getQueryLog());

    // Auth and permission lookups plus a constant handful of loads, independent of the case count.
    expect($queries)->toBeLessThan(20);
});

it('requires intake.view and authentication', function () {
    $this->getJson("/api/patients/{$this->patient->id}/uis")->assertUnauthorized();

    $outsider = User::factory()->create();
    Sanctum::actingAs($outsider);
    $this->getJson("/api/patients/{$this->patient->id}/uis")->assertForbidden();
});

it('returns the household size and the section III expense slots per case', function () {
    Sanctum::actingAs($this->worker);
    foreach (['Pedro', 'Luz'] as $name) {
        PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => $name]);
    }

    $assessed = uisCase($this->patient, $this->worker, 'CASE-SLOTS', ['date_opened' => now()->subDay()]);
    uisCase($this->patient, $this->worker, 'CASE-EMPTY');
    $assessment = Assessment::create([
        'case_id' => $assessed->id, 'created_by' => $this->worker->id, 'classification' => 'C2', 'total_family_income' => 9000,
    ]);
    $assessment->expenses()->createMany([
        ['expense_type' => 'House Rent', 'amount' => 1200],
        ['expense_type' => 'House help', 'amount' => 777],
        ['expense_type' => 'Others: School fees', 'amount' => 100],
        ['expense_type' => 'Others', 'amount' => 50],
    ]);

    $data = $this->getJson("/api/patients/{$this->patient->id}/uis")->assertOk()->json('data');

    // Two family members + the patient, the same count the classification uses; identical on every row.
    expect($data[0]['uis']['household_size'])->toBe(3)
        ->and($data[1]['uis']['household_size'])->toBe(3)
        // No assessment: no slots and no embedded assessment.
        ->and($data[0]['uis']['expense_slots'])->toBeNull()
        ->and($data[0]['uis']['assessment'])->toBeNull()
        // House help is not housing; the two Others lines add up.
        ->and($data[1]['uis']['expense_slots']['housing'])->toBe(1200)
        ->and($data[1]['uis']['expense_slots']['house_help'])->toBe(777)
        ->and($data[1]['uis']['expense_slots']['others'])->toBe(150)
        ->and($data[1]['uis']['expense_slots']['food'])->toBeNull()
        ->and($data[1]['uis']['assessment']['household_size'])->toBe(3);
});

it('counts a patient without family members as a household of one', function () {
    Sanctum::actingAs($this->worker);
    uisCase($this->patient, $this->worker, 'CASE-ALONE');

    $this->getJson("/api/patients/{$this->patient->id}/uis")->assertJsonPath('data.0.uis.household_size', 1);
});

it('matches the classification household for the same patient', function () {
    Sanctum::actingAs($this->worker);
    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Pedro']);
    $case = uisCase($this->patient, $this->worker, 'CASE-HH');

    // 9000 across a household of 2 is 4500 each (C2); the endpoint must report that same household.
    $created = $this->postJson("/api/cases/{$case->id}/assessments", ['total_family_income' => 9000])
        ->assertCreated()->assertJsonPath('data.net_per_capita_income', '4500.00');

    $this->getJson("/api/patients/{$this->patient->id}/uis")
        ->assertJsonPath('data.0.uis.household_size', 2)
        ->assertJsonPath('data.0.uis.assessment.id', $created->json('data.id'));
});
