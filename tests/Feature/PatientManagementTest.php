<?php

use App\Models\CaseModel;
use App\Models\Document;
use App\Models\Patient;
use App\Models\PatientCaretaker;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake();
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
});

function patientUser(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function makePatient(array $overrides = []): Patient
{
    return Patient::create(array_merge([
        'sector_id' => test()->sector->id,
        'first_name' => 'Juan',
        'last_name' => 'Dela Cruz',
        'sex' => 'male',
    ], $overrides));
}

function openCaseFor(Patient $patient): CaseModel
{
    return CaseModel::create([
        'patient_id' => $patient->id, 'assigned_user_id' => auth()->id() ?? User::factory()->create()->id,
        'case_code' => 'CASE-'.uniqid(), 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'ER', 'date_opened' => now(),
    ]);
}

// --- Patient CRUD ----------------------------------------------------------

it('creates a patient and auto-generates an mswd_id', function () {
    Sanctum::actingAs(patientUser());

    $this->postJson('/api/patients', [
        'sector_id' => $this->sector->id,
        'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ])
        ->assertCreated()
        ->assertJsonPath('data.first_name', 'Ana')
        ->assertJsonPath('data.mswd_id', fn ($v) => is_int($v) && $v > 0);
});

it('lists, shows and updates a patient', function () {
    Sanctum::actingAs(patientUser());
    $patient = makePatient();

    $this->getJson('/api/patients')->assertOk()->assertJsonCount(1, 'data');
    $this->getJson("/api/patients/{$patient->id}")->assertOk()->assertJsonPath('data.cases_count', 0);
    $this->putJson("/api/patients/{$patient->id}", ['contact_number' => '0917'])
        ->assertOk()->assertJsonPath('data.contact_number', '0917');
});

// --- Records ---------------------------------------------------------------

it('manages patient records through nested endpoints', function () {
    Sanctum::actingAs(patientUser());
    $patient = makePatient();

    // ID (patient_id injected from the route)
    $this->postJson("/api/patients/{$patient->id}/ids", ['id_type' => 'philhealth', 'id_number' => 'PH-1'])
        ->assertCreated()->assertJsonPath('data.patient_id', $patient->id);

    // Family member
    $this->postJson("/api/patients/{$patient->id}/family-members", ['name' => 'Maria', 'monthly_income' => 5000])
        ->assertCreated()->assertJsonPath('data.name', 'Maria');

    // Watcher
    $this->postJson("/api/patients/{$patient->id}/watchers", ['name' => 'Pedro', 'is_primary' => true])
        ->assertCreated();

    expect($patient->patientIds()->count())->toBe(1)
        ->and($patient->familyMembers()->count())->toBe(1)
        ->and($patient->watchers()->count())->toBe(1);
});

it('assigns and unassigns a social worker (caretaker)', function () {
    Sanctum::actingAs(patientUser());
    $patient = makePatient();
    $worker = User::factory()->create();

    $id = $this->postJson("/api/patients/{$patient->id}/caretakers", [
        'user_id' => $worker->id, 'role' => 'social_worker', 'assigned_date' => now()->toDateString(),
    ])->assertCreated()->json('data.id');

    $this->patchJson("/api/caretakers/{$id}/unassign")
        ->assertOk()
        ->assertJsonPath('data.is_active', false);

    expect(PatientCaretaker::find($id)->unassigned_date)->not->toBeNull();
});

it('uploads and lists a document tied to a case', function () {
    Sanctum::actingAs(patientUser());
    $patient = makePatient();
    $case = openCaseFor($patient);

    $doc = $this->post("/api/patients/{$patient->id}/documents", [
        'file' => UploadedFile::fake()->create('report.pdf', 20, 'application/pdf'),
        'document_type' => 'medical',
        'case_id' => $case->id,
    ])->assertCreated()->json('data');

    Storage::assertExists(Document::find($doc['id'])->file_path);
    $this->getJson("/api/patients/{$patient->id}/documents")->assertOk()->assertJsonCount(1, 'data');
});

// --- Profile & history -----------------------------------------------------

it('returns the consolidated profile with relations', function () {
    Sanctum::actingAs(patientUser());
    $patient = makePatient();
    $patient->patientIds()->create(['id_type' => 'philhealth', 'id_number' => 'PH-1']);
    openCaseFor($patient);

    $this->getJson("/api/patients/{$patient->id}/profile")
        ->assertOk()
        ->assertJsonPath('data.cases_count', 1)
        ->assertJsonCount(1, 'data.patient_ids')
        ->assertJsonCount(1, 'data.cases');
});

it('returns the patient audit history', function () {
    Sanctum::actingAs(patientUser());
    $patient = makePatient();
    $patient->update(['contact_number' => '0917']);

    $this->getJson("/api/patients/{$patient->id}/history")
        ->assertOk()
        ->assertJsonPath('data.0.subject_type', 'Patient');
});

// --- Archive / restore -----------------------------------------------------

it('blocks archiving a patient with an open case', function () {
    Sanctum::actingAs(patientUser());
    $patient = makePatient();
    openCaseFor($patient);

    $this->deleteJson("/api/patients/{$patient->id}")
        ->assertUnprocessable()
        ->assertJsonValidationErrorFor('patient');

    expect(Patient::find($patient->id))->not->toBeNull();
});

it('archives and restores a patient without open cases', function () {
    Sanctum::actingAs(patientUser());
    $patient = makePatient();

    $this->deleteJson("/api/patients/{$patient->id}")->assertNoContent();
    expect(Patient::find($patient->id))->toBeNull()
        ->and(Patient::withTrashed()->find($patient->id)->trashed())->toBeTrue();

    $this->postJson("/api/patients/{$patient->id}/restore")->assertOk();
    expect(Patient::find($patient->id))->not->toBeNull();
});

// --- Authorization ---------------------------------------------------------

it('forbids patient access without permission', function () {
    Sanctum::actingAs(User::factory()->create()); // no roles

    $this->getJson('/api/patients')->assertForbidden();
    $this->postJson('/api/patients', ['first_name' => 'x'])->assertForbidden();
});
