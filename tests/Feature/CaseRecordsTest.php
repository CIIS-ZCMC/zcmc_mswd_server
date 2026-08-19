<?php

use App\DTOs\CaseModelDto;
use App\Models\CaseModel;
use App\Models\InterventionType;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use App\Services\CaseModelService;
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
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
});

function recordsUser(string $role = 'Case Manager'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function caseForRecords(User $actor, Patient $patient): CaseModel
{
    return app(CaseModelService::class)->create(
        CaseModelDto::fromArray([
            'patient_id' => $patient->id, 'case_type' => 'medical',
            'priority_level' => 'high', 'admission_type' => 'ER',
        ]),
        $actor,
    );
}

it('manages assessments under a case and logs a milestone', function () {
    $worker = recordsUser();
    Sanctum::actingAs($worker);
    $case = caseForRecords($worker, $this->patient);

    $id = $this->postJson("/api/cases/{$case->id}/assessments", [
        'classification' => 'indigent', 'presenting_problem' => 'Needs meds',
    ])->assertCreated()->json('data.id');

    $this->getJson("/api/cases/{$case->id}/assessments")->assertOk()->assertJsonCount(1, 'data');
    $this->putJson("/api/assessments/{$id}", ['classification' => 'low_income'])
        ->assertOk()->assertJsonPath('data.classification', 'low_income');
    $this->deleteJson("/api/assessments/{$id}")->assertNoContent();

    expect($case->activities()->where('activity_type', 'assessment_completed')->exists())->toBeTrue();
});

it('manages diagnostics and uploads a report file', function () {
    $worker = recordsUser();
    Sanctum::actingAs($worker);
    $case = caseForRecords($worker, $this->patient);

    $diagId = $this->postJson("/api/cases/{$case->id}/diagnostics", [
        'diagnosis_name' => 'Pneumonia', 'diagnosis_date' => now()->toDateString(),
    ])->assertCreated()->json('data.id');

    expect($case->activities()->where('activity_type', 'diagnosis_added')->exists())->toBeTrue();

    $report = $this->postJson("/api/diagnostics/{$diagId}/reports", [
        'report_type' => 'xray',
        'file' => UploadedFile::fake()->create('xray.pdf', 40, 'application/pdf'),
    ])->assertCreated()->json('data');

    Storage::assertExists($report['file_path']);
    $this->getJson("/api/diagnostics/{$diagId}/reports")->assertOk()->assertJsonCount(1, 'data');
    $this->deleteJson("/api/diagnostic-reports/{$report['id']}")->assertNoContent();
});

it('manages interventions under a case', function () {
    $worker = recordsUser();
    Sanctum::actingAs($worker);
    $case = caseForRecords($worker, $this->patient);
    $type = InterventionType::create(['name' => 'Counseling', 'code' => 'CNS']);

    $id = $this->postJson("/api/cases/{$case->id}/interventions", [
        'intervention_type_id' => $type->id, 'description' => 'Session 1',
    ])->assertCreated()->json('data.id');

    $this->getJson("/api/cases/{$case->id}/interventions")->assertOk()->assertJsonCount(1, 'data');
    $this->deleteJson("/api/interventions/{$id}")->assertNoContent();
    expect($case->activities()->where('activity_type', 'intervention_given')->exists())->toBeTrue();
});

it('uploads and lists a case document', function () {
    $worker = recordsUser();
    Sanctum::actingAs($worker);
    $case = caseForRecords($worker, $this->patient);

    $doc = $this->postJson("/api/cases/{$case->id}/documents", [
        'document_type' => 'medical',
        'file' => UploadedFile::fake()->create('abstract.pdf', 20, 'application/pdf'),
    ])->assertCreated()->json('data');

    Storage::assertExists($doc['file_path']);
    expect($doc['patient_id'])->toBe($this->patient->id);
    $this->getJson("/api/cases/{$case->id}/documents")->assertOk()->assertJsonCount(1, 'data');
    $this->deleteJson("/api/cases/{$case->id}/documents/{$doc['id']}")->assertNoContent();
});

it('forbids adding a record without cases.create', function () {
    Sanctum::actingAs(recordsUser('Processor')); // cases.view only
    $case = caseForRecords(recordsUser('Case Manager'), $this->patient);

    $this->postJson("/api/cases/{$case->id}/assessments", ['classification' => 'indigent'])
        ->assertForbidden();
});
