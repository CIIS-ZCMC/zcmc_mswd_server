<?php

use App\Models\Activity;
use App\Models\Assessment;
use App\Models\AssessmentExpense;
use App\Models\AssistantType;
use App\Models\CaseModel;
use App\Models\CaseProgressNote;
use App\Models\CaseWatcher;
use App\Models\Concerns\Auditable;
use App\Models\Diagnostic;
use App\Models\DiagnosticReport;
use App\Models\Document;
use App\Models\Intervention;
use App\Models\InterventionType;
use App\Models\Patient;
use App\Models\PatientAssistance;
use App\Models\PatientAssistanceLog;
use App\Models\PatientAssistanceReport;
use App\Models\PatientCaretaker;
use App\Models\PatientFamilyMember;
use App\Models\PatientId;
use App\Models\PatientMerge;
use App\Models\PatientWatcher;
use App\Models\Sector;
use App\Models\UnifiedIntakeSheet;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Phase 2 covered one resolver per *shape*. This covers every resolver there
 * is, so a model whose parent relation is renamed cannot quietly start stamping
 * nulls — the audit row would still be written, and nothing else would fail.
 */
beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->worker = User::factory()->create();
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
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

function ownershipRowFor(object $subject): Activity
{
    return Activity::query()
        ->forSubjectKey($subject->getMorphClass(), $subject->getKey())
        ->latest('id')
        ->firstOrFail();
}

function assistanceFor(CaseModel $case, User $worker): PatientAssistance
{
    return PatientAssistance::create([
        'case_id' => $case->id,
        'assistant_type_id' => AssistantType::firstOrCreate(
            ['name' => 'Medicine'],
            ['category' => 'medical'],
        )->id,
        'date_given' => now(),
        'created_by' => $worker->id,
        'status' => 'pending',
    ]);
}

dataset('resolvers', [
    'Patient (itself)' => [fn () => test()->patient, true, false],
    'PatientId' => [fn () => PatientId::create([
        'patient_id' => test()->patient->id, 'id_type' => 'philhealth', 'id_number' => '1234',
    ]), true, false],
    'PatientFamilyMember' => [fn () => PatientFamilyMember::create([
        'patient_id' => test()->patient->id, 'name' => 'Maria',
    ]), true, false],
    'PatientWatcher' => [fn () => PatientWatcher::create([
        'patient_id' => test()->patient->id, 'name' => 'Maria', 'relationship' => 'spouse',
    ]), true, false],
    'PatientCaretaker' => [fn () => PatientCaretaker::create([
        'patient_id' => test()->patient->id, 'user_id' => test()->worker->id,
        'role' => 'social_worker', 'assigned_date' => now(),
    ]), true, false],
    'PatientMerge (to the surviving patient)' => [fn () => PatientMerge::create([
        'source_patient_id' => Patient::create([
            'sector_id' => test()->sector->id, 'first_name' => 'Dup', 'last_name' => 'Record', 'sex' => 'female',
        ])->id,
        'target_patient_id' => test()->patient->id,
        'manifest' => ['cases' => []],
        'performed_by' => test()->worker->id,
    ]), true, false],

    'CaseModel' => [fn () => test()->case, true, true],
    'CaseWatcher' => [fn () => CaseWatcher::create([
        'case_id' => test()->case->id, 'name' => 'Maria', 'relationship' => 'spouse',
        'added_by' => test()->worker->id,
    ]), true, true],
    'Assessment' => [fn () => Assessment::create([
        'case_id' => test()->case->id, 'created_by' => test()->worker->id, 'classification' => 'C',
    ]), true, true],
    'AssessmentExpense (two hops)' => [fn () => AssessmentExpense::create([
        'assessment_id' => Assessment::create([
            'case_id' => test()->case->id, 'created_by' => test()->worker->id, 'classification' => 'C',
        ])->id,
        'expense_type' => 'medicine', 'amount' => 100,
    ]), true, true],
    'CaseProgressNote' => [fn () => CaseProgressNote::create([
        'case_id' => test()->case->id, 'author_id' => test()->worker->id,
        'note_type' => CaseProgressNote::TYPE_PROGRESS, 'note_date' => now()->toDateString(),
        'narrative' => 'Phoned the daughter, following up Monday.',
    ]), true, true],
    'Intervention' => [fn () => Intervention::create([
        'case_id' => test()->case->id, 'created_by' => test()->worker->id,
        'intervention_type_id' => InterventionType::firstOrCreate(['name' => 'Counselling'])->id,
        'description' => 'X', 'date_given' => now(),
    ]), true, true],
    'Diagnostic' => [fn () => Diagnostic::create([
        'case_id' => test()->case->id, 'created_by' => test()->worker->id,
        'diagnosis_name' => 'Pneumonia', 'diagnosis_date' => now(),
    ]), true, true],
    'DiagnosticReport (two hops)' => [fn () => DiagnosticReport::create([
        'diagnostic_id' => Diagnostic::create([
            'case_id' => test()->case->id, 'created_by' => test()->worker->id,
            'diagnosis_name' => 'Pneumonia', 'diagnosis_date' => now(),
        ])->id,
        'uploaded_by' => test()->worker->id, 'report_type' => 'lab',
        'file_name' => 'a.pdf', 'file_path' => 'r/a.pdf', 'file_type' => 'pdf',
    ]), true, true],
    'PatientAssistance' => [fn () => assistanceFor(test()->case, test()->worker), true, true],
    'PatientAssistanceLog (two hops)' => [fn () => PatientAssistanceLog::create([
        'assistance_id' => assistanceFor(test()->case, test()->worker)->id,
        'status' => 'approved', 'action' => 'approve',
        'action_by' => test()->worker->id, 'action_date' => now(),
    ]), true, true],
    'PatientAssistanceReport (two hops)' => [fn () => PatientAssistanceReport::create([
        'assistance_id' => assistanceFor(test()->case, test()->worker)->id,
        'patient_name' => 'Ana Reyes', 'assistant_type' => 'Medicine', 'category' => 'medical',
        'snapshot_json' => ['x' => 1], 'released_by' => test()->worker->id, 'released_at' => now(),
    ]), true, true],
    'Document' => [fn () => Document::create([
        'patient_id' => test()->patient->id, 'case_id' => test()->case->id,
        'uploaded_by' => test()->worker->id, 'document_type' => 'consent',
        'file_name' => 'c.pdf', 'file_path' => 'd/c.pdf', 'file_type' => 'pdf',
    ]), true, true],
    'UnifiedIntakeSheet' => [fn () => UnifiedIntakeSheet::create([
        'intake_no' => 'INT-0001', 'patient_id' => test()->patient->id, 'case_id' => test()->case->id,
        'intake_worker_id' => test()->worker->id, 'date_of_intake' => now(),
        'status' => UnifiedIntakeSheet::STATUS_DRAFT,
    ]), true, true],
]);

it('resolves ownership for every audited model', function (Closure $make, bool $hasPatient, bool $hasCase) {
    $subject = $make();

    $row = ownershipRowFor($subject);

    $hasPatient
        ? expect($row->patient_id)->toBe($this->patient->id)
        : expect($row->patient_id)->toBeNull();

    $hasCase
        ? expect($row->case_id)->toBe($this->case->id)
        : expect($row->case_id)->toBeNull();
})->with('resolvers');

it('covers every model that declares a resolver', function () {
    $declared = collect(glob(app_path('Models/*.php')))
        ->map(fn ($path) => 'App\\Models\\'.basename($path, '.php'))
        ->filter(fn ($class) => in_array(Auditable::class, class_uses_recursive($class), true))
        // A trait method reports the *using* class as its declaring class, so
        // the only way to tell an override from Auditable's default is the file
        // the method's body actually lives in.
        ->filter(fn ($class) => (new ReflectionMethod($class, 'activityOwner'))->getFileName()
            !== (new ReflectionMethod(Auditable::class, 'activityOwner'))->getFileName())
        ->map(fn ($class) => class_basename($class))
        ->sort()
        ->values();

    // The models the dataset above exercises, one row each.
    $covered = collect([
        'Patient', 'PatientId', 'PatientFamilyMember', 'PatientWatcher', 'PatientCaretaker',
        'PatientMerge', 'CaseModel', 'CaseWatcher', 'CaseProgressNote', 'Assessment', 'AssessmentExpense',
        'Intervention', 'Diagnostic', 'DiagnosticReport', 'PatientAssistance',
        'PatientAssistanceLog', 'PatientAssistanceReport', 'Document', 'UnifiedIntakeSheet',
    ])->sort()->values();

    // If a model gains its own activityOwner(), it must gain a dataset row too.
    expect($declared->all())->toBe($covered->all());
});
