<?php

use App\DTOs\UnifiedIntakeSheetDto;
use App\Filament\Resources\UnifiedIntakeSheets\Pages\CreateUnifiedIntakeSheet;
use App\Filament\Resources\UnifiedIntakeSheets\Pages\ViewUnifiedIntakeSheet;
use App\Filament\Resources\UnifiedIntakeSheets\UnifiedIntakeSheetResource;
use App\Models\AssistantType;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\UnifiedIntakeSheet;
use App\Models\User;
use App\Services\UnifiedIntakeSheetService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake();
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->assistType = AssistantType::create(['name' => 'Medicine', 'code' => 'MED', 'category' => 'medical', 'is_active' => true]);
});

function intakePanelUser(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function intakePanelDraft(int $sectorId, int $assistTypeId, User $worker): UnifiedIntakeSheet
{
    return app(UnifiedIntakeSheetService::class)->createDraft(
        UnifiedIntakeSheetDto::fromArray([
            'date_of_intake' => now()->toDateString(),
            'patient' => ['sector_id' => $sectorId, 'first_name' => 'Juan', 'last_name' => 'Dela Cruz', 'sex' => 'male'],
            'case' => ['case_type' => 'medical', 'priority_level' => 'high', 'admission_type' => 'ER'],
            'assessment' => ['classification' => 'indigent', 'presenting_problem' => 'Needs meds'],
        ]),
        $worker,
    );
}

it('creates a draft intake through the Filament wizard', function () {
    actingAs(intakePanelUser('MSS Head'));

    Livewire::test(CreateUnifiedIntakeSheet::class)
        ->fillForm([
            'patient' => [
                'sector_id' => $this->sector->id,
                'first_name' => 'Juan',
                'last_name' => 'Dela Cruz',
                'sex' => 'male',
                'birthdate' => '1980-05-01',
            ],
            'family_members' => [[
                'name' => 'Maria Dela Cruz', 'relationship' => 'spouse',
                'birthdate' => '1985-03-02', 'sex' => 'female', 'age' => 40,
                'educational_attainment' => 'College graduate', 'occupation' => 'Vendor',
                'monthly_income' => 5000,
            ]],
            'patient_ids' => [['id_type' => 'philhealth', 'id_number' => 'PH-123']],
            'case' => ['case_type' => 'medical', 'priority_level' => 'high', 'admission_type' => 'ER'],
            'assessment' => ['classification' => 'indigent', 'presenting_problem' => 'Cannot afford medicine'],
            'assistances' => [['assistant_type_id' => $this->assistType->id, 'amount' => 1500, 'notes' => 'Meds']],
            'referral_source' => 'walk_in',
            'date_of_intake' => now()->toDateString(),
        ])
        ->call('create')
        ->assertHasNoFormErrors();

    $sheet = UnifiedIntakeSheet::first();
    expect($sheet)->not->toBeNull()
        ->and($sheet->status)->toBe('draft')
        ->and($sheet->intake_no)->toStartWith('UIS-')
        ->and(Patient::count())->toBe(1)
        ->and(CaseModel::count())->toBe(1)
        ->and($sheet->assessment_id)->not->toBeNull()
        ->and(Patient::first()->familyMembers)->toHaveCount(1);

    $member = Patient::first()->familyMembers->first();
    expect($member->sex)->toBe('female')
        ->and($member->educational_attainment)->toBe('College graduate')
        ->and($member->occupation)->toBe('Vendor')
        ->and($member->birthdate->toDateString())->toBe('1985-03-02');
});

it('updates an existing patient family through the wizard on reuse', function () {
    actingAs(intakePanelUser('MSS Head'));
    $patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
    $member = $patient->familyMembers()->create(['name' => 'Old Name', 'relationship' => 'spouse', 'monthly_income' => 1000]);

    Livewire::test(CreateUnifiedIntakeSheet::class)
        ->fillForm([
            'patient_id' => $patient->id,
            'family_members' => [['id' => $member->id, 'name' => 'Updated Name', 'relationship' => 'spouse', 'monthly_income' => 7000]],
            'case' => ['case_type' => 'medical', 'priority_level' => 'high', 'admission_type' => 'ER'],
            'assessment' => ['classification' => 'indigent', 'presenting_problem' => 'x'],
            'date_of_intake' => now()->toDateString(),
        ])
        ->call('create')
        ->assertHasNoFormErrors();

    expect($member->fresh()->name)->toBe('Updated Name')
        ->and($member->fresh()->monthly_income)->toEqual('7000.00')
        ->and(Patient::count())->toBe(1);
});

it('does not wipe family demographics when an existing patient is reused', function () {
    actingAs(intakePanelUser('MSS Head'));
    $patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
    $member = $patient->familyMembers()->create([
        'name' => 'Old Name', 'relationship' => 'spouse', 'monthly_income' => 1000,
        'birthdate' => '1990-01-02', 'sex' => 'female', 'age' => 35,
        'educational_attainment' => 'High school', 'occupation' => 'Vendor',
    ]);

    // Selecting the patient fires the afterStateUpdated prefill.
    $component = Livewire::test(CreateUnifiedIntakeSheet::class)
        ->fillForm(['patient_id' => $patient->id]);

    // Guard 1: every field the repeater renders must come back prefilled. This
    // is what fails first — and points straight at the cause — if someone adds
    // a repeater field and forgets the prefill map.
    $row = collect($component->get('data.family_members'))->first();
    expect($row['sex'])->toBe('female')
        ->and($row['educational_attainment'])->toBe('High school')
        ->and($row['occupation'])->toBe('Vendor')
        ->and($row['birthdate'])->toBe('1990-01-02');

    // Guard 2: saving without touching the family step must not null anything.
    $component->fillForm([
        'case' => ['case_type' => 'medical', 'priority_level' => 'high', 'admission_type' => 'ER'],
        'assessment' => ['classification' => 'indigent', 'presenting_problem' => 'x'],
        'date_of_intake' => now()->toDateString(),
    ])
        ->call('create')
        ->assertHasNoFormErrors();

    $member->refresh();
    expect($member->sex)->toBe('female')
        ->and($member->educational_attainment)->toBe('High school')
        ->and($member->occupation)->toBe('Vendor')
        ->and($member->age)->toBe(35)                             // birthdate must not clobber it
        ->and($member->birthdate->toDateString())->toBe('1990-01-02');
});

it('finalizes an intake from the view page', function () {
    $worker = intakePanelUser('MSS Head');
    actingAs($worker);
    $sheet = intakePanelDraft($this->sector->id, $this->assistType->id, $worker);

    Livewire::test(ViewUnifiedIntakeSheet::class, ['record' => $sheet->getKey()])
        ->callAction('finalize');

    expect($sheet->fresh()->status)->toBe('finalized')
        ->and($sheet->fresh()->finalized_by)->toBe($worker->id);
});

it('cancels a draft intake from the view page', function () {
    $worker = intakePanelUser('MSS Head');
    actingAs($worker);
    $sheet = intakePanelDraft($this->sector->id, $this->assistType->id, $worker);

    Livewire::test(ViewUnifiedIntakeSheet::class, ['record' => $sheet->getKey()])
        ->callAction('cancel');

    expect($sheet->fresh()->status)->toBe('cancelled')
        ->and($sheet->fresh()->trashed())->toBeTrue();
});

it('exposes the history relation on the intake', function () {
    $worker = intakePanelUser('MSS Head');
    $sheet = intakePanelDraft($this->sector->id, $this->assistType->id, $worker);

    expect($sheet->activities()->count())->toBeGreaterThan(0);
});

it('gates the resource on intake permissions', function () {
    actingAs(intakePanelUser('MSS Head'));
    expect(UnifiedIntakeSheetResource::canViewAny())->toBeTrue()
        ->and(UnifiedIntakeSheetResource::canCreate())->toBeTrue();

    actingAs(User::factory()->create()); // no roles / permissions
    expect(UnifiedIntakeSheetResource::canViewAny())->toBeFalse()
        ->and(UnifiedIntakeSheetResource::canCreate())->toBeFalse();
});
