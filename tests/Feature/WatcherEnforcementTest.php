<?php

use App\Models\AssistantType;
use App\Models\CaseModel;
use App\Models\CaseWatcher;
use App\Models\Guarantor;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\WatcherRelationshipTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->seed(WatcherRelationshipTypeSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
});

function enforcementUser(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function enforcementPatient(): Patient
{
    return Patient::create([
        'sector_id' => test()->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
        'birthdate' => now()->subYears(30)->toDateString(),
    ]);
}

function enforcementCase(Patient $patient, User $worker, array $overrides = []): CaseModel
{
    return CaseModel::create(array_merge([
        'patient_id' => $patient->id, 'assigned_user_id' => $worker->id,
        'case_code' => 'CASE-'.uniqid(), 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'inpatient', 'date_opened' => now(),
    ], $overrides));
}

function registerPrimaryWatcher(CaseModel $case, User $worker): CaseWatcher
{
    return CaseWatcher::create([
        'case_id' => $case->id, 'name' => 'Maria Reyes', 'relationship' => 'spouse',
        'is_primary' => true, 'added_by' => $worker->id,
    ]);
}

// --- Close case ---------------------------------------------------------

it('blocks closing an inpatient case with no registered watcher', function () {
    $worker = enforcementUser();
    Sanctum::actingAs($worker);
    $case = enforcementCase(enforcementPatient(), $worker);

    $response = $this->postJson("/api/cases/{$case->id}/close")->assertStatus(422);

    $response->assertJsonPath('errors.watcher.0', fn ($m) => is_string($m) && str_contains($m, 'be closed'))
        ->assertJson(['watcher_status' => [
            'requirement' => 'required', 'has_primary' => false, 'satisfied' => false, 'blocking' => true,
        ]]);

    expect($case->refresh()->status)->toBe('open');
});

it('allows closing an inpatient case once a primary watcher is registered', function () {
    $worker = enforcementUser();
    Sanctum::actingAs($worker);
    $case = enforcementCase(enforcementPatient(), $worker);
    registerPrimaryWatcher($case, $worker);

    $this->postJson("/api/cases/{$case->id}/close")->assertOk();
    expect($case->refresh()->status)->toBe('closed');
});

it('allows closing an inpatient case once the watcher requirement is waived', function () {
    $worker = enforcementUser();
    Sanctum::actingAs($worker);
    $case = enforcementCase(enforcementPatient(), $worker);

    $this->postJson("/api/cases/{$case->id}/watcher-waiver", ['watcher_waiver_reason' => 'unaccompanied'])->assertOk();
    $this->postJson("/api/cases/{$case->id}/close")->assertOk();
});

it('allows closing an OPD case with no watcher at all, since none is required', function () {
    $worker = enforcementUser();
    Sanctum::actingAs($worker);
    $case = enforcementCase(enforcementPatient(), $worker, ['admission_type' => 'OPD']);

    $this->postJson("/api/cases/{$case->id}/close")->assertOk();
});

// --- Approve assistance ---------------------------------------------------

it('blocks approving assistance on an inpatient case with no registered watcher', function () {
    $worker = enforcementUser();
    Sanctum::actingAs($worker);
    $case = enforcementCase(enforcementPatient(), $worker);
    $assistType = AssistantType::create(['name' => 'Medicine', 'code' => 'MED', 'category' => 'pharmacy', 'is_active' => true]);
    $guarantor = Guarantor::create(['name' => 'PCSO', 'is_active' => true]);
    $assistance = $case->patientAssistances()->create([
        'assistant_type_id' => $assistType->id, 'guarantor_id' => $guarantor->id,
        'amount' => 1000, 'status' => 'pending', 'date_given' => now(), 'created_by' => $worker->id,
    ]);

    $this->postJson("/api/assistances/{$assistance->id}/approve")->assertStatus(422);
    expect($assistance->refresh()->status)->toBe('pending');
});

it('allows approving assistance once a primary watcher is registered', function () {
    $worker = enforcementUser();
    Sanctum::actingAs($worker);
    $case = enforcementCase(enforcementPatient(), $worker);
    registerPrimaryWatcher($case, $worker);
    $assistType = AssistantType::create(['name' => 'Medicine', 'code' => 'MED', 'category' => 'pharmacy', 'is_active' => true]);
    $guarantor = Guarantor::create(['name' => 'PCSO', 'is_active' => true]);
    $assistance = $case->patientAssistances()->create([
        'assistant_type_id' => $assistType->id, 'guarantor_id' => $guarantor->id,
        'amount' => 1000, 'status' => 'pending', 'date_given' => now(), 'created_by' => $worker->id,
    ]);

    $this->postJson("/api/assistances/{$assistance->id}/approve")->assertOk();
});

// --- Store assessment ------------------------------------------------------

it('blocks storing a standalone assessment on an inpatient case with no registered watcher', function () {
    $worker = enforcementUser();
    Sanctum::actingAs($worker);
    $case = enforcementCase(enforcementPatient(), $worker);

    $this->postJson("/api/cases/{$case->id}/assessments", ['classification' => 'indigent'])->assertStatus(422);
});

it('allows storing a standalone assessment once a primary watcher is registered', function () {
    $worker = enforcementUser();
    Sanctum::actingAs($worker);
    $case = enforcementCase(enforcementPatient(), $worker);
    registerPrimaryWatcher($case, $worker);

    $this->postJson("/api/cases/{$case->id}/assessments", ['classification' => 'indigent'])->assertCreated();
});

// --- Submit / finalize intake sheet ----------------------------------------

it('blocks submitting an intake sheet whose case is inpatient with no registered watcher', function () {
    $worker = enforcementUser();
    Sanctum::actingAs($worker);
    $intakeId = $this->postJson('/api/intake-sheets', enforcementIntakePayload($this->sector->id, 'inpatient'))
        ->assertCreated()->json('data.id');

    $this->postJson("/api/intake-sheets/{$intakeId}/submit")->assertStatus(422);
});

it('blocks finalizing an intake sheet whose case is inpatient with no registered watcher', function () {
    $worker = enforcementUser();
    Sanctum::actingAs($worker);
    $intakeId = $this->postJson('/api/intake-sheets', enforcementIntakePayload($this->sector->id, 'inpatient'))
        ->assertCreated()->json('data.id');

    $this->postJson("/api/intake-sheets/{$intakeId}/finalize")->assertStatus(422);
});

it('allows submitting and finalizing an intake sheet once a primary watcher is registered', function () {
    $worker = enforcementUser();
    Sanctum::actingAs($worker);
    $response = $this->postJson('/api/intake-sheets', enforcementIntakePayload($this->sector->id, 'inpatient'))->assertCreated();
    $intakeId = $response->json('data.id');
    $caseId = $response->json('data.case_id');
    registerPrimaryWatcher(CaseModel::find($caseId), $worker);

    $this->postJson("/api/intake-sheets/{$intakeId}/submit")->assertOk();
    $this->postJson("/api/intake-sheets/{$intakeId}/finalize")->assertOk();
});

function enforcementIntakePayload(int $sectorId, string $admissionType): array
{
    return [
        'referral_source' => 'walk_in',
        'date_of_intake' => now()->toDateString(),
        'patient' => [
            'sector_id' => $sectorId, 'first_name' => 'Juan', 'last_name' => 'Dela Cruz',
            'sex' => 'male', 'birthdate' => '1980-05-01',
        ],
        'case' => ['case_type' => 'medical', 'priority_level' => 'high', 'admission_type' => $admissionType],
        'assessment' => ['classification' => 'indigent'],
    ];
}

// --- Transitions that must never block --------------------------------------

it('never blocks reopening a case, even with an unmet watcher requirement', function () {
    $worker = enforcementUser();
    Sanctum::actingAs($worker);
    $case = enforcementCase(enforcementPatient(), $worker);
    $case->update(['status' => 'closed']);

    $this->postJson("/api/cases/{$case->id}/reopen")->assertOk();
});

it('never blocks changing admission_type via PUT, even when it newly requires a watcher', function () {
    $worker = enforcementUser();
    Sanctum::actingAs($worker);
    $case = enforcementCase(enforcementPatient(), $worker, ['admission_type' => 'OPD']);

    $this->putJson("/api/cases/{$case->id}", ['admission_type' => 'inpatient'])->assertOk();
    expect($case->refresh()->admission_type)->toBe('inpatient');
});
