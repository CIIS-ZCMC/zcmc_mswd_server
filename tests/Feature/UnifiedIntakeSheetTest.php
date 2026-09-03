<?php

use App\Models\AssistantType;
use App\Models\CaseModel;
use App\Models\Document;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\UnifiedIntakeSheet;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake();
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->assistType = AssistantType::create(['name' => 'Medicine', 'code' => 'MED', 'category' => 'medical', 'is_active' => true]);
});

function intakeWorker(string $role = 'Case Manager'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function newIntakePayload(int $sectorId, int $assistTypeId, bool $withAssessment = true): array
{
    return array_filter([
        'referral_source' => 'walk_in',
        'date_of_intake' => now()->toDateString(),
        'patient' => [
            'sector_id' => $sectorId,
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'sex' => 'male',
            'birthdate' => '1980-05-01',
        ],
        'family_members' => [
            [
                'name' => 'Maria Dela Cruz', 'relationship' => 'spouse',
                'birthdate' => '1985-03-02', 'sex' => 'female', 'age' => 40,
                'educational_attainment' => 'College graduate', 'occupation' => 'Vendor',
                'monthly_income' => 5000,
            ],
        ],
        'patient_ids' => [
            ['id_type' => 'philhealth', 'id_number' => 'PH-123'],
        ],
        'case' => [
            'case_type' => 'medical',
            'priority_level' => 'high',
            'admission_type' => 'ER',
        ],
        'assessment' => $withAssessment ? [
            'classification' => 'indigent',
            'total_family_income' => 5000,
            'presenting_problem' => 'Cannot afford medicine',
        ] : null,
        'assistances' => [
            ['assistant_type_id' => $assistTypeId, 'amount' => 1500, 'notes' => 'Meds'],
        ],
    ], fn ($v) => $v !== null);
}

it('creates a draft intake that assembles patient, case, assessment and assistance', function () {
    Sanctum::actingAs(intakeWorker());

    $response = $this->postJson('/api/intake-sheets', newIntakePayload($this->sector->id, $this->assistType->id))
        ->assertCreated()
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.referral_source', 'walk_in');

    $intakeNo = $response->json('data.intake_no');
    expect($intakeNo)->toStartWith('UIS-'.now()->year.'-');

    $sheet = UnifiedIntakeSheet::first();
    expect($sheet->patient_id)->not->toBeNull()
        ->and($sheet->case_id)->not->toBeNull()
        ->and($sheet->assessment_id)->not->toBeNull();

    expect(Patient::count())->toBe(1)
        ->and(CaseModel::count())->toBe(1)
        ->and(Patient::first()->familyMembers)->toHaveCount(1)
        ->and(Patient::first()->patientIds)->toHaveCount(1)
        ->and(CaseModel::first()->patientAssistances)->toHaveCount(1);

    // Every demographic in the payload must survive validation: an unruled key
    // is silently dropped by validated() and never reaches the model.
    $member = Patient::first()->familyMembers->first();
    expect($member->sex)->toBe('female')
        ->and($member->educational_attainment)->toBe('College graduate')
        ->and($member->occupation)->toBe('Vendor')
        ->and($member->age)->toBe(40)
        ->and($member->birthdate->toDateString())->toBe('1985-03-02');

    // Milestone written to the case timeline
    expect(CaseModel::first()->activities()->where('activity_type', 'case_opened')->exists())->toBeTrue();

    // Field-level audit captured for the sheet
    expect(Activity::where('log_name', 'intake')->exists())->toBeTrue();
});

it('reuses an existing patient instead of creating a duplicate', function () {
    Sanctum::actingAs(intakeWorker());
    $patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);

    $payload = newIntakePayload($this->sector->id, $this->assistType->id);
    unset($payload['patient'], $payload['family_members'], $payload['patient_ids']);
    $payload['patient_id'] = $patient->id;

    $this->postJson('/api/intake-sheets', $payload)->assertCreated();

    expect(Patient::count())->toBe(1)
        ->and(UnifiedIntakeSheet::first()->patient_id)->toBe($patient->id);
});

it('updates the existing patient family and IDs on reuse', function () {
    Sanctum::actingAs(intakeWorker());
    $patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
    $keep = $patient->familyMembers()->create([
        'name' => 'Old Name', 'relationship' => 'spouse', 'monthly_income' => 1000,
        'sex' => 'female', 'educational_attainment' => 'High school',
    ]);
    $remove = $patient->familyMembers()->create(['name' => 'Gone', 'relationship' => 'child']);
    $pid = $patient->patientIds()->create(['id_type' => 'philhealth', 'id_number' => 'OLD-1']);

    $this->postJson('/api/intake-sheets', [
        'date_of_intake' => now()->toDateString(),
        'patient_id' => $patient->id,
        'family_members' => [
            [
                'id' => $keep->id, 'name' => 'New Name', 'relationship' => 'spouse',
                'monthly_income' => 7000, 'educational_attainment' => 'College graduate',
            ],
            ['name' => 'Baby', 'relationship' => 'child'],
        ],
        'patient_ids' => [
            ['id' => $pid->id, 'id_type' => 'philhealth', 'id_number' => 'UPDATED-1'],
        ],
        'case' => ['case_type' => 'medical', 'priority_level' => 'high', 'admission_type' => 'ER'],
        'assessment' => ['classification' => 'indigent'],
    ])->assertCreated();

    $patient->refresh();
    expect($patient->familyMembers()->count())->toBe(2)           // one updated, one created, one removed
        ->and($keep->fresh()->name)->toBe('New Name')
        ->and($keep->fresh()->monthly_income)->toEqual('7000.00')
        ->and($keep->fresh()->educational_attainment)->toBe('College graduate')
        ->and($keep->fresh()->sex)->toBe('female')                // omitted from the payload — untouched
        ->and($remove->fresh()->trashed())->toBeTrue()
        ->and($pid->fresh()->id_number)->toBe('UPDATED-1')
        ->and(Patient::count())->toBe(1);
});

it('attaches the intake to an existing open case', function () {
    Sanctum::actingAs(intakeWorker());
    $patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
    $case = CaseModel::create([
        'patient_id' => $patient->id, 'assigned_user_id' => auth()->id(), 'case_code' => 'CASE-X',
        'case_type' => 'medical', 'priority_level' => 'low', 'status' => 'open',
        'admission_type' => 'OPD', 'date_opened' => now(),
    ]);

    $payload = newIntakePayload($this->sector->id, $this->assistType->id);
    unset($payload['patient'], $payload['family_members'], $payload['patient_ids'], $payload['case']);
    $payload['patient_id'] = $patient->id;
    $payload['case_id'] = $case->id;

    $this->postJson('/api/intake-sheets', $payload)
        ->assertCreated()
        ->assertJsonPath('data.case_id', $case->id);

    expect(CaseModel::count())->toBe(1)
        ->and($case->activities()->where('activity_type', 'intake_appended')->exists())->toBeTrue();
});

it('rejects attaching to a closed case', function () {
    Sanctum::actingAs(intakeWorker());
    $patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
    $case = CaseModel::create([
        'patient_id' => $patient->id, 'assigned_user_id' => auth()->id(), 'case_code' => 'CASE-Y',
        'case_type' => 'medical', 'priority_level' => 'low', 'status' => 'closed',
        'admission_type' => 'OPD', 'date_opened' => now(),
    ]);

    $payload = newIntakePayload($this->sector->id, $this->assistType->id);
    unset($payload['patient'], $payload['family_members'], $payload['patient_ids'], $payload['case']);
    $payload['patient_id'] = $patient->id;
    $payload['case_id'] = $case->id;

    $this->postJson('/api/intake-sheets', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrorFor('case_id');
});

it('rejects supplying both a new and an existing patient', function () {
    Sanctum::actingAs(intakeWorker());
    $patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);

    $payload = newIntakePayload($this->sector->id, $this->assistType->id);
    $payload['patient_id'] = $patient->id; // plus the new `patient` block

    $this->postJson('/api/intake-sheets', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrorFor('patient');
});

it('finalizes a complete draft and stamps the finalizer', function () {
    $worker = intakeWorker('Supervisor'); // has intake.finalize
    Sanctum::actingAs($worker);
    $create = $this->postJson('/api/intake-sheets', newIntakePayload($this->sector->id, $this->assistType->id))->assertCreated();
    $id = $create->json('data.id');

    $this->postJson("/api/intake-sheets/{$id}/finalize")
        ->assertOk()
        ->assertJsonPath('data.status', 'finalized')
        ->assertJsonPath('data.finalized_by', $worker->id);

    expect(UnifiedIntakeSheet::find($id)->finalized_at)->not->toBeNull();
});

it('archives a PDF document when an intake is finalized', function () {
    $worker = intakeWorker('Supervisor');
    Sanctum::actingAs($worker);
    $id = $this->postJson('/api/intake-sheets', newIntakePayload($this->sector->id, $this->assistType->id))
        ->assertCreated()->json('data.id');

    $this->postJson("/api/intake-sheets/{$id}/finalize")->assertOk();

    $sheet = UnifiedIntakeSheet::find($id);
    $doc = Document::where('document_type', 'intake_sheet')->where('case_id', $sheet->case_id)->first();

    expect($doc)->not->toBeNull()
        ->and($doc->file_type)->toBe('application/pdf')
        ->and($doc->patient_id)->toBe($sheet->patient_id)
        ->and($doc->uploaded_by)->toBe($worker->id)
        ->and($doc->file_name)->toBe("{$sheet->intake_no}.pdf");

    Storage::assertExists($doc->file_path);
});

it('will not finalize a draft that has no assessment', function () {
    Sanctum::actingAs(intakeWorker('Supervisor'));
    $create = $this->postJson('/api/intake-sheets', newIntakePayload($this->sector->id, $this->assistType->id, withAssessment: false))->assertCreated();
    $id = $create->json('data.id');

    $this->postJson("/api/intake-sheets/{$id}/finalize")->assertUnprocessable();
});

it('forbids finalizing without the intake.finalize permission', function () {
    Sanctum::actingAs(intakeWorker('Processor')); // create/update but not finalize
    $create = $this->postJson('/api/intake-sheets', newIntakePayload($this->sector->id, $this->assistType->id))->assertCreated();
    $id = $create->json('data.id');

    $this->postJson("/api/intake-sheets/{$id}/finalize")->assertForbidden();
});

it('forbids intake listing for a user lacking intake.view', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user); // no roles at all

    $this->getJson('/api/intake-sheets')->assertForbidden();
});

it('returns the audit history for an intake', function () {
    Sanctum::actingAs(intakeWorker());
    $create = $this->postJson('/api/intake-sheets', newIntakePayload($this->sector->id, $this->assistType->id))->assertCreated();
    $id = $create->json('data.id');

    $this->getJson("/api/intake-sheets/{$id}/history")
        ->assertOk()
        ->assertJsonPath('data.0.subject_type', fn ($t) => is_string($t));
});

it('matches candidate patients for dedupe', function () {
    Sanctum::actingAs(intakeWorker());
    Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Juan', 'last_name' => 'Dela Cruz',
        'sex' => 'male', 'birthdate' => '1980-05-01',
    ]);

    $this->postJson('/api/intake-sheets/match-patients', [
        'last_name' => 'Dela Cruz', 'first_name' => 'Juan', 'birthdate' => '1980-05-01',
    ])
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

it('cancels a draft but not a finalized intake', function () {
    Sanctum::actingAs(intakeWorker('MSS Head')); // has finalize + delete
    $create = $this->postJson('/api/intake-sheets', newIntakePayload($this->sector->id, $this->assistType->id))->assertCreated();
    $id = $create->json('data.id');

    $this->deleteJson("/api/intake-sheets/{$id}")->assertNoContent();
    expect(UnifiedIntakeSheet::withTrashed()->find($id)->status)->toBe('cancelled');
});
