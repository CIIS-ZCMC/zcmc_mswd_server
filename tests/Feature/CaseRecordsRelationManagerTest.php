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
