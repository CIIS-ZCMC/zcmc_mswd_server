<?php

use App\Models\Assessment;
use App\Models\AssistantType;
use App\Models\Bizbox\HospitalPatient;
use App\Models\Bizbox\PatientTransaction;
use App\Models\Bizbox\TransactionType;
use App\Models\CaseModel;
use App\Models\Guarantor;
use App\Models\Patient;
use App\Models\PatientFamilyMember;
use App\Models\PatientGuarantee;
use App\Models\Sector;
use App\Models\UisPrintLog;
use App\Models\User;
use App\Repositories\Contracts\PatientTransactionRepositoryInterface;
use App\Services\UnifiedIntakeSheetPdfService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->worker = User::factory()->create(['role' => 'MSS Head']);
    $this->worker->assignRole('MSS Head');

    $this->patient = Patient::create([
        'sector_id' => Sector::firstOrCreate(['code' => 'MED'], ['name' => 'Medical'])->id,
        'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female', 'hospital_id' => 777,
    ]);
});

/** HIS encounter 42 of HIS patient $patid, an outpatient consultation. */
function mockIntakeEncounter(int $patid = 777): void
{
    $encounter = (new PatientTransaction)->forceFill([
        'PK_psPatRegisters' => 42, 'registrydate' => '2026-09-14 08:30:00', 'pattrantype' => 'O',
    ]);
    $encounter->setRelation('patient', (new HospitalPatient)->forceFill(['PK_emdPatients' => 5, 'patid' => $patid]));
    $encounter->setRelation('transactionType', (new TransactionType)->forceFill(['PK_mscHospTranTypes' => 8, 'description' => 'Outpatient Consultation']));

    test()->mock(PatientTransactionRepositoryInterface::class, function ($mock) use ($encounter) {
        $mock->shouldReceive('find')->andReturn($encounter);
    });
}

function intakePayload(array $overrides = []): array
{
    return array_merge([
        'his_transaction_id' => 42,
        'total_family_income' => 9000,
        'informant_name' => 'Maria Reyes',
        'presenting_problem' => 'Medicines',
        'expenses' => [['expense_type' => 'Food', 'amount' => 3000]],
    ], $overrides);
}

function intakeCase(Patient $patient, User $worker, array $overrides = []): CaseModel
{
    return CaseModel::create(array_merge([
        'patient_id' => $patient->id, 'assigned_user_id' => $worker->id,
        'case_code' => 'CASE-1', 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'OPD', 'date_opened' => now(),
    ], $overrides));
}

function intakeGuarantee(Patient $patient, string $guarantor, string $type, float $amount): PatientGuarantee
{
    $guarantee = PatientGuarantee::create([
        'patient_id' => $patient->id, 'his_transaction_id' => 42, 'hospital_id' => $patient->hospital_id,
        'guarantor_id' => Guarantor::firstOrCreate(['name' => $guarantor])->id,
        'guaranteed_on' => '2026-09-14', 'recorded_by' => User::query()->value('id'),
    ]);
    $guarantee->items()->create([
        'assistant_type_id' => AssistantType::firstOrCreate(['code' => str($type)->slug('_')->value()], ['name' => $type, 'category' => 'medical'])->id,
        'amount' => $amount,
    ]);

    return $guarantee;
}

it('takes an intake assessment for an encounter without a case', function () {
    Sanctum::actingAs($this->worker);
    mockIntakeEncounter();
    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Pedro']);

    $id = $this->postJson("/api/patients/{$this->patient->id}/intake-assessments", intakePayload())
        ->assertCreated()
        ->assertJsonPath('data.case_id', null)
        ->assertJsonPath('data.patient_id', $this->patient->id)
        ->assertJsonPath('data.his_transaction_id', 42)
        ->assertJsonPath('data.transaction_type', 'Outpatient Consultation')
        ->json('data.id');

    $intake = Assessment::with('expenses')->find($id);
    expect($intake->encounter_date->toDateTimeString())->toBe('2026-09-14 08:30:00')
        ->and($intake->created_by)->toBe($this->worker->id)
        ->and($intake->expenses)->toHaveCount(1)
        // The patient's household: (9,000 − 3,000) / 2 members.
        ->and((float) $intake->net_per_capita_income)->toBe(3000.0);
});

it('takes one intake per encounter', function () {
    Sanctum::actingAs($this->worker);
    mockIntakeEncounter();

    $this->postJson("/api/patients/{$this->patient->id}/intake-assessments", intakePayload())->assertCreated();
    $this->postJson("/api/patients/{$this->patient->id}/intake-assessments", intakePayload())
        ->assertJsonValidationErrors('his_transaction_id');
});

it('refuses an encounter of another patient', function () {
    Sanctum::actingAs($this->worker);
    mockIntakeEncounter(patid: 999);

    $this->postJson("/api/patients/{$this->patient->id}/intake-assessments", intakePayload())
        ->assertJsonValidationErrors('his_transaction_id');

    expect(Assessment::count())->toBe(0);
});

it('requires the encounter and cases.create', function () {
    Sanctum::actingAs($this->worker);
    $this->postJson("/api/patients/{$this->patient->id}/intake-assessments", intakePayload(['his_transaction_id' => null]))
        ->assertJsonValidationErrors('his_transaction_id');

    $viewer = User::factory()->create(['role' => 'Processor']);
    $viewer->assignRole('Processor');
    Sanctum::actingAs($viewer);
    $this->postJson("/api/patients/{$this->patient->id}/intake-assessments", intakePayload())->assertForbidden();
});

it('links the encounter case straight away when one exists', function () {
    Sanctum::actingAs($this->worker);
    mockIntakeEncounter();
    $case = intakeCase($this->patient, $this->worker, ['transaction_id' => 42]);

    $this->postJson("/api/patients/{$this->patient->id}/intake-assessments", intakePayload())
        ->assertCreated()
        ->assertJsonPath('data.case_id', $case->id);
});

it('hands the intake to a case opened later on its encounter', function () {
    Sanctum::actingAs($this->worker);
    mockIntakeEncounter();
    $intakeId = $this->postJson("/api/patients/{$this->patient->id}/intake-assessments", intakePayload())->json('data.id');

    $caseId = $this->postJson('/api/cases', [
        'patient_id' => $this->patient->id, 'case_type' => 'medical', 'priority_level' => 'high',
        'admission_type' => 'OPD', 'transaction_id' => 42,
    ])->assertCreated()->json('data.id');

    expect(Assessment::find($intakeId)->case_id)->toBe($caseId);
    $this->getJson("/api/cases/{$caseId}/assessments")->assertOk()->assertJsonPath('data.0.id', $intakeId);
});

it('gives a case assessment its case patient and encounter', function () {
    $case = intakeCase($this->patient, $this->worker, ['transaction_id' => 55, 'transaction_type' => 'Emergency']);

    $assessment = Assessment::create(['case_id' => $case->id, 'created_by' => $this->worker->id, 'classification' => 'D']);

    expect($assessment->patient_id)->toBe($this->patient->id)
        ->and($assessment->his_transaction_id)->toBe(55)
        ->and($assessment->transaction_type)->toBe('Emergency');
});

it('lists an intake without a case on the UIS tab with its guarantors', function () {
    Sanctum::actingAs($this->worker);
    mockIntakeEncounter();
    $intakeId = $this->postJson("/api/patients/{$this->patient->id}/intake-assessments", intakePayload())->json('data.id');
    intakeGuarantee($this->patient, 'DOH-MAIFIP', 'Laboratory', 800);
    intakeGuarantee($this->patient, 'PCSO', 'Medicines', 529.6);
    $unassessed = intakeCase($this->patient, $this->worker, ['case_code' => 'CASE-2', 'transaction_id' => 77]);

    $rows = collect($this->getJson("/api/patients/{$this->patient->id}/uis")->assertOk()->json('data'));
    $intakeRow = $rows->firstWhere('uis.assessment_id', $intakeId);

    expect($rows)->toHaveCount(2)
        ->and($intakeRow['case'])->toBeNull()
        ->and($intakeRow['encounter']['transaction_id'])->toBe(42)
        ->and($intakeRow['encounter']['transaction_type'])->toBe('Outpatient Consultation')
        ->and($intakeRow['guarantees'])->toBe(['count' => 2, 'total' => 1329.6])
        ->and($rows->firstWhere('case.id', $unassessed->id)['uis']['has_assessment'])->toBeFalse();
});

it('prints the intake UIS with its guarantors in section V and logs the print', function () {
    Sanctum::actingAs($this->worker);
    mockIntakeEncounter();
    $intakeId = $this->postJson("/api/patients/{$this->patient->id}/intake-assessments", intakePayload())->json('data.id');
    intakeGuarantee($this->patient, 'DOH-MAIFIP', 'Laboratory', 800);

    $this->get("/api/assessments/{$intakeId}/uis/pdf?remarks=Billing")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');

    $log = UisPrintLog::sole();
    expect($log->case_id)->toBeNull()
        ->and($log->patient_id)->toBe($this->patient->id)
        ->and($log->transaction_id)->toBe(42)
        ->and($log->remarks)->toBe('Billing');

    $this->getJson("/api/assessments/{$intakeId}/uis")->assertOk()
        ->assertJsonPath('data.print_count', 1)
        ->assertJsonPath('data.has_assessment', true);
    $this->getJson("/api/assessments/{$intakeId}/uis/prints")->assertOk()->assertJsonCount(1, 'data');

    $sheet = app(UnifiedIntakeSheetPdfService::class);
    $html = $sheet->renderForAssessment(Assessment::find($intakeId))->getDomPDF()->outputHtml();
    expect($html)->toContain('<td>Laboratory</td><td class="center">800</td>')->toContain('<td>DOH-MAIFIP</td>')
        ->and($sheet->filenameForAssessment(Assessment::find($intakeId)))->toBe('UIS-777-ENC-42.pdf');
});

it('keeps prints made before the case in the case history', function () {
    Sanctum::actingAs($this->worker);
    mockIntakeEncounter();
    $intakeId = $this->postJson("/api/patients/{$this->patient->id}/intake-assessments", intakePayload())->json('data.id');
    $this->get("/api/assessments/{$intakeId}/uis/pdf")->assertOk();

    $case = intakeCase($this->patient, $this->worker, ['transaction_id' => 42]);
    Assessment::whereKey($intakeId)->update(['case_id' => $case->id]);

    $this->getJson("/api/cases/{$case->id}/uis/prints")->assertOk()->assertJsonCount(1, 'data');
    $this->getJson("/api/cases/{$case->id}/uis")->assertOk()->assertJsonPath('data.assessment_id', $intakeId);
});

it('does not serve a social case study as a UIS', function () {
    Sanctum::actingAs($this->worker);
    $case = intakeCase($this->patient, $this->worker);
    $scsr = Assessment::create([
        'case_id' => $case->id, 'created_by' => $this->worker->id, 'classification' => 'B',
        'social_case_status' => Assessment::SOCIAL_CASE_DRAFT,
    ]);

    $this->getJson("/api/assessments/{$scsr->id}/uis")->assertNotFound();
});

it('backfills the patient and encounter of existing case assessments', function () {
    $migration = require database_path('migrations/2026_10_18_010000_decouple_assessments_from_cases.php');
    $case = intakeCase($this->patient, $this->worker, ['transaction_id' => 55, 'transaction_type' => 'Emergency']);
    $id = Assessment::create(['case_id' => $case->id, 'created_by' => $this->worker->id, 'classification' => 'D'])->id;

    $migration->down();
    $migration->up();

    expect(DB::table('assessments')->where('id', $id)->first())
        ->patient_id->toBe($this->patient->id)
        ->his_transaction_id->toBe(55)
        ->transaction_type->toBe('Emergency');
});
