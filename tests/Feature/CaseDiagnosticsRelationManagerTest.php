<?php

use App\DTOs\CaseModelDto;
use App\Filament\Resources\Cases\Pages\ViewCase;
use App\Filament\Resources\Cases\RelationManagers\DiagnosticsRelationManager;
use App\Models\CaseModel;
use App\Models\Diagnostic;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use App\Services\CaseModelService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake();
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
});

function diagUser(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function diagCase(User $actor, Patient $patient): CaseModel
{
    return app(CaseModelService::class)->create(
        CaseModelDto::fromArray([
            'patient_id' => $patient->id, 'case_type' => 'medical',
            'priority_level' => 'high', 'admission_type' => 'ER',
        ]),
        $actor,
    );
}

function diagRm(CaseModel $case)
{
    return Livewire::test(DiagnosticsRelationManager::class, [
        'ownerRecord' => $case,
        'pageClass' => ViewCase::class,
    ]);
}

it('creates a diagnosis through the relation manager', function () {
    $worker = diagUser();
    actingAs($worker);
    $case = diagCase($worker, $this->patient);

    diagRm($case)->callTableAction('create', data: [
        'diagnosis_name' => 'Pneumonia',
        'diagnosis_date' => now()->toDateString(),
        'attending_physician' => 'Dr. Cruz',
    ])->assertHasNoTableActionErrors();

    $diag = Diagnostic::first();
    expect($diag)->not->toBeNull()
        ->and($diag->case_id)->toBe($case->id)
        ->and($diag->created_by)->toBe($worker->id)
        ->and($diag->diagnosis_name)->toBe('Pneumonia');
});

it('edits and deletes a diagnosis through the relation manager', function () {
    $worker = diagUser();
    actingAs($worker);
    $case = diagCase($worker, $this->patient);
    $diag = $case->diagnostics()->create([
        'created_by' => $worker->id, 'diagnosis_name' => 'Old', 'diagnosis_date' => now(),
    ]);

    diagRm($case)->callTableAction('edit', $diag, data: ['diagnosis_name' => 'Updated'])
        ->assertHasNoTableActionErrors();
    expect($diag->fresh()->diagnosis_name)->toBe('Updated');

    diagRm($case)->callTableAction('delete', $diag);
    expect(Diagnostic::find($diag->id))->toBeNull();
});

it('uploads a report through the reports modal', function () {
    $worker = diagUser();
    actingAs($worker);
    $case = diagCase($worker, $this->patient);
    $diag = $case->diagnostics()->create([
        'created_by' => $worker->id, 'diagnosis_name' => 'Pneumonia', 'diagnosis_date' => now(),
    ]);

    diagRm($case)->callTableAction('reports', $diag, data: [
        'existing' => [],
        'new_report_type' => 'xray',
        'new_file' => UploadedFile::fake()->create('xray.pdf', 30, 'application/pdf'),
    ])->assertHasNoTableActionErrors();

    $report = $diag->reports()->first();
    expect($report)->not->toBeNull()
        ->and($report->report_type)->toBe('xray');
    Storage::assertExists($report->file_path);
});

it('deletes a report removed from the reports modal', function () {
    $worker = diagUser();
    actingAs($worker);
    $case = diagCase($worker, $this->patient);
    $diag = $case->diagnostics()->create([
        'created_by' => $worker->id, 'diagnosis_name' => 'Pneumonia', 'diagnosis_date' => now(),
    ]);
    $keep = $diag->reports()->create([
        'uploaded_by' => $worker->id, 'report_type' => 'lab', 'file_name' => 'keep.pdf',
        'file_path' => 'x/keep.pdf', 'file_type' => 'application/pdf',
    ]);
    $remove = $diag->reports()->create([
        'uploaded_by' => $worker->id, 'report_type' => 'xray', 'file_name' => 'gone.pdf',
        'file_path' => 'x/gone.pdf', 'file_type' => 'application/pdf',
    ]);

    diagRm($case)->callTableAction('reports', $diag, data: [
        'existing' => [
            ['id' => $keep->id, 'report_type' => 'lab', 'file_name' => 'keep.pdf', 'remarks' => null],
        ],
    ])->assertHasNoTableActionErrors();

    expect($diag->reports()->count())->toBe(1)
        ->and($diag->reports()->first()->id)->toBe($keep->id);
});

it('hides report management from a user without cases.update', function () {
    $case = diagCase(diagUser('MSS Head'), $this->patient);
    $diag = $case->diagnostics()->create([
        'created_by' => auth()->id() ?? 1, 'diagnosis_name' => 'Pneumonia', 'diagnosis_date' => now(),
    ]);

    actingAs(diagUser('Processor')); // cases.view only

    diagRm($case)->assertTableActionHidden('reports', $diag);
});
