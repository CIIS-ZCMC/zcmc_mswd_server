<?php

use App\Models\Activity;
use App\Models\Assessment;
use App\Models\AssessmentExpense;
use App\Models\CaseModel;
use App\Models\Diagnostic;
use App\Models\DiagnosticReport;
use App\Models\Document;
use App\Models\Guarantor;
use App\Models\Intervention;
use App\Models\InterventionType;
use App\Models\Patient;
use App\Models\PatientWatcher;
use App\Models\Sector;
use App\Models\User;
use App\Services\CaseModelService;
use App\Services\PatientService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
    $this->worker = User::factory()->create(['role' => 'Case Manager']);
    $this->case = CaseModel::create([
        'patient_id' => $this->patient->id,
        'case_code' => 'CASE-2026-000001',
        'case_type' => 'medical',
        'priority_level' => 'high',
        'admission_type' => 'ER',
        'status' => CaseModel::STATUS_OPEN,
        'assigned_user_id' => $this->worker->id,
        'date_opened' => now(),
    ]);
});

/** The intervention_types row every intervention needs, created once. */
function interventionType(): InterventionType
{
    return InterventionType::firstOrCreate(['name' => 'Counselling']);
}

/** The most recent trail row written for a given subject. */
function ownershipOf(object $subject): Activity
{
    return Activity::query()
        ->forSubjectKey($subject->getMorphClass(), $subject->getKey())
        ->latest('id')
        ->firstOrFail();
}

it('stamps the patient on a direct resolver', function () {
    $watcher = PatientWatcher::create([
        'patient_id' => $this->patient->id,
        'name' => 'Maria Cruz',
        'relationship' => 'spouse',
    ]);

    $row = ownershipOf($watcher);

    expect($row->patient_id)->toBe($this->patient->id)
        ->and($row->case_id)->toBeNull();
});

it('stamps both owners on the case itself', function () {
    $row = ownershipOf($this->case);

    expect($row->patient_id)->toBe($this->patient->id)
        ->and($row->case_id)->toBe($this->case->id);
});

it('stamps both owners through a one-hop resolver', function () {
    $assessment = Assessment::create([
        'case_id' => $this->case->id,
        'created_by' => $this->worker->id,
        'classification' => 'C',
    ]);

    $row = ownershipOf($assessment);

    expect($row->patient_id)->toBe($this->patient->id)
        ->and($row->case_id)->toBe($this->case->id);
});

it('stamps both owners through a two-hop resolver', function () {
    $assessment = Assessment::create([
        'case_id' => $this->case->id,
        'created_by' => $this->worker->id,
        'classification' => 'C',
    ]);
    $expense = AssessmentExpense::create([
        'assessment_id' => $assessment->id,
        'expense_type' => 'medicine',
        'amount' => 1500,
    ]);

    $row = ownershipOf($expense);

    expect($row->patient_id)->toBe($this->patient->id)
        ->and($row->case_id)->toBe($this->case->id);
});

it('stamps a diagnostic report through its diagnostic', function () {
    $diagnostic = Diagnostic::create([
        'case_id' => $this->case->id,
        'created_by' => $this->worker->id,
        'diagnosis_name' => 'Pneumonia',
        'diagnosis_date' => now(),
    ]);
    $report = DiagnosticReport::create([
        'diagnostic_id' => $diagnostic->id,
        'uploaded_by' => $this->worker->id,
        'report_type' => 'lab',
        'file_name' => 'cbc.pdf',
        'file_path' => 'reports/cbc.pdf',
        'file_type' => 'pdf',
    ]);

    $row = ownershipOf($report);

    expect($row->patient_id)->toBe($this->patient->id)
        ->and($row->case_id)->toBe($this->case->id);
});

it('reads both owners straight off a document', function () {
    // documents.patient_id and documents.case_id are both NOT NULL, so a
    // document always knows both and the resolver never needs to hop.
    $document = Document::create([
        'patient_id' => $this->patient->id,
        'case_id' => $this->case->id,
        'uploaded_by' => $this->worker->id,
        'document_type' => 'consent',
        'file_name' => 'consent.pdf',
        'file_path' => 'docs/consent.pdf',
        'file_type' => 'pdf',
    ]);

    $row = ownershipOf($document);

    expect($row->patient_id)->toBe($this->patient->id)
        ->and($row->case_id)->toBe($this->case->id);
});

it('still attributes a delete whose parent is already soft-deleted', function () {
    $intervention = Intervention::create([
        'case_id' => $this->case->id,
        'created_by' => $this->worker->id,
        'intervention_type_id' => interventionType()->id,
        'description' => 'Counselling',
        'date_given' => now(),
    ]);

    // The case goes first, so resolution has to reach through withTrashed().
    $this->case->delete();
    $intervention->delete();

    $row = Activity::query()
        ->forSubjectKey($intervention->getMorphClass(), $intervention->getKey())
        ->where('event', 'deleted')
        ->firstOrFail();

    expect($row->patient_id)->toBe($this->patient->id)
        ->and($row->case_id)->toBe($this->case->id);
});

it('stamps nulls rather than failing when there is no owner to resolve', function () {
    $guarantor = Guarantor::create(['name' => 'Bank of X', 'is_active' => true]);

    $row = ownershipOf($guarantor);

    expect($row->patient_id)->toBeNull()
        ->and($row->case_id)->toBeNull();
});

it('reaches episode-level records the old fan-out could not name', function () {
    Intervention::create([
        'case_id' => $this->case->id,
        'created_by' => $this->worker->id,
        'intervention_type_id' => interventionType()->id,
        'description' => 'Counselling',
        'date_given' => now(),
    ]);

    $patientTrail = app(PatientService::class)->history($this->patient);
    $caseTrail = app(CaseModelService::class)->history($this->case);

    $subjects = fn ($trail) => $trail->pluck('subject_type')->map(fn ($t) => class_basename((string) $t));

    expect($subjects($patientTrail))->toContain('Intervention')
        ->and($subjects($caseTrail))->toContain('Intervention');
});

it('keeps a patient trail to one query regardless of how many record types it spans', function () {
    Assessment::create(['case_id' => $this->case->id, 'created_by' => $this->worker->id, 'classification' => 'C']);
    Diagnostic::create(['case_id' => $this->case->id, 'created_by' => $this->worker->id, 'diagnosis_name' => 'Pneumonia', 'diagnosis_date' => now()]);
    Intervention::create(['case_id' => $this->case->id, 'created_by' => $this->worker->id, 'intervention_type_id' => interventionType()->id, 'description' => 'X', 'date_given' => now()]);
    PatientWatcher::create(['patient_id' => $this->patient->id, 'name' => 'Maria', 'relationship' => 'spouse']);

    $queries = 0;
    DB::listen(function () use (&$queries) {
        $queries++;
    });

    app(PatientService::class)->history($this->patient);

    // One for the trail, one for the eager-loaded causers. The old fan-out cost
    // one pluck per subject type before it could even build the query.
    expect($queries)->toBeLessThanOrEqual(2);
});

/** Runs the backfill migration the way `artisan migrate` would. */
function runBackfill(): void
{
    (require database_path('migrations/2026_09_11_100001_backfill_activity_log_ownership.php'))->up();
}

it('backfills ownership onto rows written before the columns existed', function () {
    $assessment = Assessment::create([
        'case_id' => $this->case->id,
        'created_by' => $this->worker->id,
        'classification' => 'C',
    ]);

    // Simulate the pre-migration state: the rows exist, unstamped.
    DB::table('activity_log')->update(['patient_id' => null, 'case_id' => null]);

    runBackfill();

    $row = ownershipOf($assessment);

    expect($row->patient_id)->toBe($this->patient->id)
        ->and($row->case_id)->toBe($this->case->id);
});

it('is idempotent, so a re-run changes nothing', function () {
    Assessment::create([
        'case_id' => $this->case->id,
        'created_by' => $this->worker->id,
        'classification' => 'C',
    ]);
    DB::table('activity_log')->update(['patient_id' => null, 'case_id' => null]);

    runBackfill();
    $afterFirst = DB::table('activity_log')->orderBy('id')->get(['id', 'patient_id', 'case_id']);

    runBackfill();
    $afterSecond = DB::table('activity_log')->orderBy('id')->get(['id', 'patient_id', 'case_id']);

    expect($afterSecond->toArray())->toEqual($afterFirst->toArray());
});

it('leaves a row whose subject is gone unattributed rather than guessing', function () {
    DB::table('activity_log')->insert([
        'log_name' => 'patient',
        'description' => 'created',
        'subject_type' => Patient::class,
        'subject_id' => 99999,
        'event' => 'created',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    runBackfill();

    $orphan = DB::table('activity_log')->where('subject_id', 99999)->first();

    expect($orphan->patient_id)->toBeNull()
        ->and($orphan->case_id)->toBeNull();
});
