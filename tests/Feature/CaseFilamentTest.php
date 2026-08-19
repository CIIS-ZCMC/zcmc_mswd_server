<?php

use App\DTOs\CaseModelDto;
use App\Filament\Resources\Cases\CaseResource;
use App\Filament\Resources\Cases\Pages\CreateCase;
use App\Filament\Resources\Cases\Pages\ListCases;
use App\Filament\Resources\Cases\Pages\ViewCase;
use App\Models\CaseModel;
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

function casePanelUser(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function panelCase(User $actor, Patient $patient): CaseModel
{
    return app(CaseModelService::class)->create(
        CaseModelDto::fromArray([
            'patient_id' => $patient->id, 'case_type' => 'medical',
            'priority_level' => 'high', 'admission_type' => 'ER',
        ]),
        $actor,
    );
}

it('opens a case through the panel with a generated code', function () {
    actingAs(casePanelUser());

    Livewire::test(CreateCase::class)
        ->fillForm([
            'patient_id' => $this->patient->id,
            'case_type' => 'medical',
            'priority_level' => 'high',
            'admission_type' => 'ER',
            'date_opened' => now()->toDateString(),
        ])
        ->call('create')
        ->assertHasNoFormErrors();

    $case = CaseModel::first();
    expect($case)->not->toBeNull()
        ->and($case->case_code)->toStartWith('CASE-')
        ->and($case->status)->toBe('open');
});

it('assigns a case from the panel', function () {
    $worker = casePanelUser();
    actingAs($worker);
    $case = panelCase($worker, $this->patient);
    $other = casePanelUser('Case Manager');

    Livewire::test(ViewCase::class, ['record' => $case->getKey()])
        ->callAction('assign', ['assigned_user_id' => $other->id]);

    expect($case->fresh()->assigned_user_id)->toBe($other->id);
});

it('closes a case from the panel', function () {
    $worker = casePanelUser();
    actingAs($worker);
    $case = panelCase($worker, $this->patient);

    Livewire::test(ViewCase::class, ['record' => $case->getKey()])
        ->callAction('close');

    expect($case->fresh()->status)->toBe('closed')
        ->and($case->fresh()->date_closed)->not->toBeNull();
});

it('blocks archiving an open case from the panel', function () {
    $worker = casePanelUser();
    actingAs($worker);
    $case = panelCase($worker, $this->patient);

    Livewire::test(ViewCase::class, ['record' => $case->getKey()])
        ->callAction('archive');

    expect($case->fresh()->trashed())->toBeFalse();
});

it('gates the resource on case permissions', function () {
    actingAs(casePanelUser('MSS Head'));
    expect(CaseResource::canViewAny())->toBeTrue()
        ->and(CaseResource::canCreate())->toBeTrue();

    actingAs(User::factory()->create());
    expect(CaseResource::canViewAny())->toBeFalse()
        ->and(CaseResource::canCreate())->toBeFalse();
});

it('lists cases for an authorized user', function () {
    $worker = casePanelUser();
    actingAs($worker);
    panelCase($worker, $this->patient);

    Livewire::test(ListCases::class)->assertOk();
});
