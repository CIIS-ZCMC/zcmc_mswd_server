<?php

use App\DTOs\CaseModelDto;
use App\Filament\Resources\Cases\Pages\ViewCase;
use App\Filament\Resources\Cases\RelationManagers\AssessmentsRelationManager;
use App\Filament\Resources\Cases\RelationManagers\InterventionsRelationManager;
use App\Models\Assessment;
use App\Models\CaseModel;
use App\Models\Intervention;
use App\Models\InterventionType;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use App\Services\CaseModelService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
});

function recRmUser(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function recRmCase(User $actor, Patient $patient): CaseModel
{
    return app(CaseModelService::class)->create(
        CaseModelDto::fromArray([
            'patient_id' => $patient->id, 'case_type' => 'medical',
            'priority_level' => 'high', 'admission_type' => 'ER',
        ]),
        $actor,
    );
}

function recRm(string $manager, CaseModel $case)
{
    return Livewire::test($manager, ['ownerRecord' => $case, 'pageClass' => ViewCase::class]);
}

it('creates, edits and deletes an assessment through the relation manager', function () {
    $worker = recRmUser();
    actingAs($worker);
    $case = recRmCase($worker, $this->patient);

    recRm(AssessmentsRelationManager::class, $case)
        ->callTableAction('create', data: ['classification' => 'indigent', 'presenting_problem' => 'Needs meds'])
        ->assertHasNoTableActionErrors();

    $assessment = Assessment::first();
    expect($assessment->case_id)->toBe($case->id)
        ->and($assessment->created_by)->toBe($worker->id)
        ->and($assessment->classification)->toBe('indigent');

    recRm(AssessmentsRelationManager::class, $case)
        ->callTableAction('edit', $assessment, data: ['classification' => 'low_income'])
        ->assertHasNoTableActionErrors();
    expect($assessment->fresh()->classification)->toBe('low_income');

    recRm(AssessmentsRelationManager::class, $case)->callTableAction('delete', $assessment);
    expect(Assessment::find($assessment->id))->toBeNull();
});

it('creates and deletes an intervention through the relation manager', function () {
    $worker = recRmUser();
    actingAs($worker);
    $case = recRmCase($worker, $this->patient);
    $type = InterventionType::create(['name' => 'Counseling', 'code' => 'CNS']);

    recRm(InterventionsRelationManager::class, $case)
        ->callTableAction('create', data: [
            'intervention_type_id' => $type->id,
            'date_given' => now()->toDateString(),
            'description' => 'Session 1',
        ])
        ->assertHasNoTableActionErrors();

    $intervention = Intervention::first();
    expect($intervention->case_id)->toBe($case->id)
        ->and($intervention->created_by)->toBe($worker->id)
        ->and($intervention->intervention_type_id)->toBe($type->id);

    recRm(InterventionsRelationManager::class, $case)->callTableAction('delete', $intervention);
    expect(Intervention::find($intervention->id))->toBeNull();
});

it('gates create/edit/delete on cases.update', function () {
    actingAs(recRmUser('Processor')); // cases.view only
    expect((new AssessmentsRelationManager)->canCreate())->toBeFalse()
        ->and((new InterventionsRelationManager)->canCreate())->toBeFalse();

    actingAs(recRmUser('MSS Head'));
    expect((new AssessmentsRelationManager)->canCreate())->toBeTrue()
        ->and((new InterventionsRelationManager)->canCreate())->toBeTrue();
});

it('saves the UIS intake fields from the assessment form', function () {
    $worker = recRmUser();
    actingAs($worker);
    $case = recRmCase($worker, $this->patient);

    recRm(AssessmentsRelationManager::class, $case)
        ->callTableAction('create', data: [
            'classification' => 'indigent',
            'informant_name' => 'Maria Reyes',
            'informant_relationship' => 'Daughter',
            'referral_source' => 'Ward 3',
            'other_income_sources' => [
                ['source' => 'Remittance', 'amount' => 1500],
                ['source' => 'Store', 'amount' => 500],
            ],
            'medical_history' => 'Hypertension',
            'recommendation' => 'Medicine assistance',
            'recommendation_mode' => 'Guarantee Letter',
            'fund_source' => 'MSWD Fund',
        ])
        ->assertHasNoTableActionErrors();

    $assessment = Assessment::sole();
    expect($assessment->informant_name)->toBe('Maria Reyes')
        ->and($assessment->informant_relationship)->toBe('Daughter')
        ->and($assessment->referral_source)->toBe('Ward 3')
        ->and($assessment->other_income_sources)->toHaveCount(2)
        ->and($assessment->other_income_sources[0]['source'])->toBe('Remittance')
        ->and($assessment->medical_history)->toBe('Hypertension')
        ->and($assessment->recommendation)->toBe('Medicine assistance')
        ->and($assessment->recommendation_mode)->toBe('Guarantee Letter')
        ->and($assessment->fund_source)->toBe('MSWD Fund');
});

it('requires a source on each other-income row', function () {
    $worker = recRmUser();
    actingAs($worker);
    $case = recRmCase($worker, $this->patient);

    recRm(AssessmentsRelationManager::class, $case)
        ->callTableAction('create', data: [
            'classification' => 'indigent',
            'other_income_sources' => [['amount' => 100]],
        ])
        ->assertHasTableActionErrors();

    expect(Assessment::count())->toBe(0);
});

it('calculates the MSWD classification when the form leaves it blank, like the API', function () {
    $worker = recRmUser();
    actingAs($worker);
    $case = recRmCase($worker, $this->patient);

    recRm(AssessmentsRelationManager::class, $case)
        ->callTableAction('create', data: ['total_family_income' => 4500])
        ->assertHasNoTableActionErrors();

    $assessment = Assessment::sole();
    expect($assessment->classification)->toBe('C2')
        ->and($assessment->calculated_classification)->toBe('C2')
        ->and($assessment->calculated_discount_rate)->toBe('75.00')
        ->and($assessment->net_per_capita_income)->toBe('4500.00')
        ->and($assessment->hasOverride())->toBeFalse();

    // Editing the income recalculates the metrics.
    recRm(AssessmentsRelationManager::class, $case)
        ->callTableAction('edit', $assessment, data: ['total_family_income' => 15000])
        ->assertHasNoTableActionErrors();

    expect($assessment->fresh()->calculated_classification)->toBe('A');
});

it('records the assessment_completed milestone on create', function () {
    $worker = recRmUser();
    actingAs($worker);
    $case = recRmCase($worker, $this->patient);

    recRm(AssessmentsRelationManager::class, $case)
        ->callTableAction('create', data: ['total_family_income' => 1000])
        ->assertHasNoTableActionErrors();

    expect(App\Models\CaseActivity::where('case_id', $case->id)->where('activity_type', 'assessment_completed')->exists())->toBeTrue();
});

it('refuses to assess an inpatient case that has no watcher yet', function () {
    $worker = recRmUser();
    actingAs($worker);
    $case = app(CaseModelService::class)->create(
        CaseModelDto::fromArray([
            'patient_id' => $this->patient->id, 'case_type' => 'medical',
            'priority_level' => 'high', 'admission_type' => 'inpatient',
        ]),
        $worker,
    );

    recRm(AssessmentsRelationManager::class, $case)
        ->callTableAction('create', data: ['total_family_income' => 1000]);

    expect(Assessment::count())->toBe(0);
});

it('keeps a legacy classification selectable and unchanged when editing other fields', function () {
    $worker = recRmUser();
    actingAs($worker);
    $case = recRmCase($worker, $this->patient);
    $assessment = Assessment::create([
        'case_id' => $case->id, 'created_by' => $worker->id,
        'classification' => 'indigent', 'total_family_income' => 4500,
    ]);

    recRm(AssessmentsRelationManager::class, $case)
        ->mountTableAction('edit', $assessment)
        ->assertTableActionDataSet(['classification' => 'indigent'])
        ->setTableActionData(['presenting_problem' => 'Needs meds'])
        ->callMountedTableAction()
        ->assertHasNoTableActionErrors();

    expect($assessment->fresh()->classification)->toBe('indigent')
        ->and($assessment->fresh()->presenting_problem)->toBe('Needs meds');
});

it('reverts to the calculated classification when the select is cleared', function () {
    $worker = recRmUser();
    actingAs($worker);
    $case = recRmCase($worker, $this->patient);
    $assessment = Assessment::create([
        'case_id' => $case->id, 'created_by' => $worker->id,
        'classification' => 'indigent', 'total_family_income' => 4500,
    ]);

    recRm(AssessmentsRelationManager::class, $case)
        ->callTableAction('edit', $assessment, data: ['classification' => null])
        ->assertHasNoTableActionErrors();

    expect($assessment->fresh()->classification)->toBe('C2');
});
