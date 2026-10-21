<?php

use App\Models\Assessment;
use App\Models\AssessmentExpense;
use App\Models\Bizbox\HospitalPatient;
use App\Models\Bizbox\PatientTransaction;
use App\Models\Bizbox\TransactionType;
use App\Models\Patient;
use App\Models\PatientFamilyMember;
use App\Models\PatientSocioeconomicProfile;
use App\Models\Sector;
use App\Models\User;
use App\Repositories\Contracts\PatientTransactionRepositoryInterface;
use App\Services\UisSocioeconomicImporter;
use App\Services\UnifiedIntakeSheetPdfService;
use App\Support\UisExpenseSlots;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->worker = User::factory()->create(['role' => 'MSS Head']);
    $this->worker->assignRole('MSS Head');
    Sanctum::actingAs($this->worker);

    $this->patient = Patient::create([
        'sector_id' => Sector::firstOrCreate(['code' => 'MED'], ['name' => 'Medical'])->id,
        'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female', 'hospital_id' => 777,
    ]);
});

/** HIS encounter 42 of HIS patient 777, so the intake endpoint has an encounter to anchor to. */
function importEncounter(): void
{
    $encounter = (new PatientTransaction)->forceFill([
        'PK_psPatRegisters' => 42, 'registrydate' => '2026-09-14 08:30:00', 'pattrantype' => 'O',
    ]);
    $encounter->setRelation('patient', (new HospitalPatient)->forceFill(['PK_emdPatients' => 5, 'patid' => 777]));
    $encounter->setRelation('transactionType', (new TransactionType)->forceFill(['PK_mscHospTranTypes' => 8, 'description' => 'Outpatient Consultation']));

    test()->mock(PatientTransactionRepositoryInterface::class, function ($mock) use ($encounter) {
        $mock->shouldReceive('find')->andReturn($encounter);
    });
}

function importRecord(Patient $patient, array $overrides = []): PatientSocioeconomicProfile
{
    return PatientSocioeconomicProfile::create(array_merge([
        'patient_id' => $patient->id,
        'recorded_on' => '2026-10-21',
        'recorded_by' => test()->worker->id,
        'house_tenure' => 'owned',
        'light_source' => ['electricity'],
        'water_source' => ['public'],
        'food' => 2500,
        'transport' => 1500,
        'total_family_income' => 30000,
    ], $overrides));
}

function importIntake(Patient $patient, array $overrides = []): Assessment
{
    $response = test()->postJson("/api/patients/{$patient->id}/intake-assessments", array_merge([
        'his_transaction_id' => 42,
        'informant_name' => 'Maria Reyes',
        'presenting_problem' => 'Medicines',
    ], $overrides))->assertCreated();

    return Assessment::findOrFail($response->json('data.id'))->load('expenses');
}

function lineAmounts(Assessment $assessment): array
{
    return $assessment->expenses->pluck('amount', 'expense_type')->map(fn ($amount) => (float) $amount)->all();
}

it('imports income, living conditions and expenses when an intake is taken', function () {
    importEncounter();
    $record = importRecord($this->patient, [
        'other_income_sources' => [['source' => 'Remittance', 'amount' => 5000]],
    ]);

    $intake = importIntake($this->patient);

    expect($intake->house_tenure)->toBe('owned')
        ->and($intake->light_source)->toBe(['electricity'])
        ->and($intake->water_source)->toBe(['public'])
        ->and((float) $intake->total_family_income)->toBe(30000.0)
        ->and($intake->other_income_sources)->toBe([['source' => 'Remittance', 'amount' => 5000]])
        ->and(lineAmounts($intake))->toBe(['Food' => 2500.0, 'Transportation' => 1500.0])
        ->and($intake->socioeconomic_profile_id)->toBe($record->id)
        ->and($intake->socioeconomic_imported_at)->not->toBeNull();
});

it('classifies the new intake against the imported income and expenses', function () {
    importEncounter();
    importRecord($this->patient, ['total_family_income' => 9000, 'food' => 3000, 'transport' => null]);
    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Pedro Reyes']);

    $intake = importIntake($this->patient);

    // (9000 - 3000) / a household of 2.
    expect((float) $intake->net_per_capita_income)->toBe(3000.0);
});

it('makes a line only for a filled item, and the rent only when rented', function () {
    $owned = importRecord($this->patient, [
        'house_tenure' => 'owned', 'house_rent_amount' => 3500, 'food' => 100, 'transport' => null,
    ]);
    $rented = importRecord($this->patient, [
        'recorded_on' => '2026-10-22', 'house_tenure' => 'rented', 'house_rent_amount' => 3500, 'food' => 100, 'transport' => null,
    ]);

    $importer = app(UisSocioeconomicImporter::class);

    expect(collect($importer->expenseLines($owned))->pluck('expense_type')->all())->toBe(['Food'])
        ->and(collect($importer->expenseLines($rented))->pluck('expense_type')->all())->toBe(['House rent', 'Food']);
});

it('lands every imported line in its own slot of the form', function () {
    $record = importRecord($this->patient, [
        'house_tenure' => 'rented', 'house_rent_amount' => 1200, 'food' => 2, 'transport' => 3, 'medical' => 4,
        'insurance' => 5, 'education' => 6, 'clothing' => 7, 'house_help' => 8, 'others' => 9,
        'others_specify' => 'School fees',
    ]);

    $slots = UisExpenseSlots::slots(
        collect(app(UisSocioeconomicImporter::class)->expenseLines($record))->map(fn ($line) => (object) $line)
    );

    // House help is not housing, and "Others: …" is Others only.
    expect($slots)->toBe([
        'housing' => 1200.0, 'food' => 2.0, 'education' => 6.0, 'transport' => 3.0, 'clothing' => 7.0,
        'medical' => 4.0, 'house_help' => 8.0, 'insurance' => 5.0, 'others' => 9.0,
    ]);
});

it('labels the others line with what it is for', function () {
    $record = importRecord($this->patient, ['others' => 400, 'others_specify' => 'School fees']);

    expect(collect(app(UisSocioeconomicImporter::class)->expenseLines($record))->pluck('expense_type')->all())
        ->toContain('Others: School fees');
});

it('lets what the request supplied win over the import', function () {
    importEncounter();
    importRecord($this->patient);

    $intake = importIntake($this->patient, [
        'total_family_income' => 12000,
        'house_tenure' => 'rented',
        'expenses' => [['expense_type' => 'Food', 'amount' => 800]],
    ]);

    expect((float) $intake->total_family_income)->toBe(12000.0)
        ->and($intake->house_tenure)->toBe('rented')
        ->and(lineAmounts($intake))->toBe(['Food' => 800.0])
        // Light and water were not supplied, so those still came from the record.
        ->and($intake->light_source)->toBe(['electricity'])
        ->and($intake->socioeconomic_profile_id)->not->toBeNull();
});

it('imports nothing for a patient with no record', function () {
    importEncounter();

    $intake = importIntake($this->patient);

    expect($intake->expenses)->toHaveCount(0)
        ->and($intake->total_family_income)->toBeNull()
        ->and($intake->house_tenure)->toBeNull()
        ->and($intake->socioeconomic_profile_id)->toBeNull();
});

it('uses the newest record and skips a deleted one', function () {
    importEncounter();
    importRecord($this->patient, ['recorded_on' => '2026-09-01', 'food' => 111]);
    $newest = importRecord($this->patient, ['recorded_on' => '2026-10-21', 'food' => 222]);
    $deleted = importRecord($this->patient, ['recorded_on' => '2026-10-30', 'food' => 333]);
    $deleted->delete();

    $intake = importIntake($this->patient);

    expect(lineAmounts($intake)['Food'])->toBe(222.0)
        ->and($intake->socioeconomic_profile_id)->toBe($newest->id);
});

it('breaks a tie between records on the same day by the later one', function () {
    importRecord($this->patient, ['recorded_on' => '2026-10-21', 'food' => 1]);
    $later = importRecord($this->patient, ['recorded_on' => '2026-10-21', 'food' => 2]);

    expect(app(UisSocioeconomicImporter::class)->latestFor($this->patient)->id)->toBe($later->id);
});

it('pulls the record onto an existing sheet on refresh, replacing its own lines', function () {
    importEncounter();
    // The intake was taken before the worker recorded the List of Expenses.
    $intake = importIntake($this->patient, [
        'total_family_income' => 4000,
        'expenses' => [['expense_type' => 'Food', 'amount' => 50]],
    ]);
    $record = importRecord($this->patient);

    $this->postJson("/api/assessments/{$intake->id}/uis-snapshot/refresh")->assertOk();

    $refreshed = $intake->fresh()->load('expenses');

    expect(lineAmounts($refreshed))->toBe(['Food' => 2500.0, 'Transportation' => 1500.0])
        ->and((float) $refreshed->total_family_income)->toBe(30000.0)
        ->and($refreshed->house_tenure)->toBe('owned')
        ->and($refreshed->socioeconomic_profile_id)->toBe($record->id)
        ->and($refreshed->socioeconomic_imported_at)->not->toBeNull()
        // 30000 - 4000 over a household of 1.
        ->and((float) $refreshed->net_per_capita_income)->toBe(26000.0);
});

it('leaves the sheet alone on refresh when the patient has no record', function () {
    importEncounter();
    $intake = importIntake($this->patient, [
        'total_family_income' => 4000,
        'expenses' => [['expense_type' => 'Food', 'amount' => 50]],
    ]);

    $this->postJson("/api/assessments/{$intake->id}/uis-snapshot/refresh")->assertOk();

    $after = $intake->fresh()->load('expenses');

    expect(lineAmounts($after))->toBe(['Food' => 50.0])
        ->and((float) $after->total_family_income)->toBe(4000.0)
        ->and($after->socioeconomic_profile_id)->toBeNull();
});

it('keeps the sheet\'s lines on refresh when the record holds no expense items', function () {
    importEncounter();
    $intake = importIntake($this->patient, ['expenses' => [['expense_type' => 'Food', 'amount' => 50]]]);
    importRecord($this->patient, [
        'food' => null, 'transport' => null, 'house_tenure' => 'rented', 'house_rent_amount' => null,
    ]);

    $this->postJson("/api/assessments/{$intake->id}/uis-snapshot/refresh")->assertOk();

    $after = $intake->fresh()->load('expenses');

    // Its tenure came across, but a refresh never wipes figures with nothing to replace them.
    expect(lineAmounts($after))->toBe(['Food' => 50.0])
        ->and($after->house_tenure)->toBe('rented');
});

it('reaches the audit trail when refresh replaces the expense lines', function () {
    importEncounter();
    $intake = importIntake($this->patient, ['expenses' => [['expense_type' => 'Food', 'amount' => 50]]]);
    importRecord($this->patient);

    $this->postJson("/api/assessments/{$intake->id}/uis-snapshot/refresh")->assertOk();

    expect(Activity::where('subject_type', AssessmentExpense::class)
        ->where('event', 'deleted')->count())->toBe(1);
});

it('prints the imported amounts in section III of the sheet', function () {
    importEncounter();
    importRecord($this->patient, ['food' => 2500, 'transport' => 1500]);

    $intake = importIntake($this->patient);

    $html = app(UnifiedIntakeSheetPdfService::class)
        ->renderForAssessment($intake->fresh(), $this->worker)
        ->getDomPDF()->outputHtml();

    expect($html)->toContain('2500', '1500', '30000');
});

it('flags a newer record on the patient UIS tab', function () {
    importEncounter();
    $first = importRecord($this->patient, ['recorded_on' => '2026-10-01']);
    $intake = importIntake($this->patient);

    $row = fn () => collect($this->getJson("/api/patients/{$this->patient->id}/uis")->assertOk()->json('data'))
        ->firstWhere('uis.assessment_id', $intake->id)['uis']['socioeconomic'];

    expect($row()['imported_id'])->toBe($first->id)
        ->and($row()['newer_available'])->toBeFalse();

    $newer = importRecord($this->patient, ['recorded_on' => '2026-10-21']);

    expect($row()['latest_id'])->toBe($newer->id)
        ->and($row()['latest_recorded_on'])->toBe('2026-10-21')
        ->and($row()['newer_available'])->toBeTrue();

    $this->postJson("/api/assessments/{$intake->id}/uis-snapshot/refresh")->assertOk();

    expect($row()['newer_available'])->toBeFalse();
});

it('reports no newer record for a patient who has none', function () {
    importEncounter();
    $intake = importIntake($this->patient);

    $row = collect($this->getJson("/api/patients/{$this->patient->id}/uis")->assertOk()->json('data'))
        ->firstWhere('uis.assessment_id', $intake->id)['uis']['socioeconomic'];

    expect($row['latest_id'])->toBeNull()->and($row['newer_available'])->toBeFalse();
});
