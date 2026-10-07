<?php

use App\Filament\Resources\Patients\Pages\ViewPatient;
use App\Filament\Resources\Patients\RelationManagers\GuaranteesRelationManager;
use App\Models\AssistantType;
use App\Models\FundSource;
use App\Models\Guarantor;
use App\Models\ModeOfAssistance;
use App\Models\Patient;
use App\Models\PatientGuarantee;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\GuarantorSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Filament\Forms\Components\Repeater;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Spatie\Permission\Models\Permission;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->seed(GuarantorSeeder::class);

    $this->patient = Patient::create([
        'sector_id' => Sector::create(['name' => 'Medical', 'code' => 'MED'])->id, 'hospital_id' => 777,
        'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
    $this->admin = guaranteeRmUser('Admin');

    $this->medicines = AssistantType::where('code', 'medicines')->firstOrFail();
    $this->hospitalBill = AssistantType::where('code', 'hospital_bill')->firstOrFail();
    $this->financial = ModeOfAssistance::where('code', 'financial_assistance')->firstOrFail();
    $this->mayorFund = FundSource::where('code', 'city_mayor')->firstOrFail();
    $this->othersFund = FundSource::where('code', 'others')->firstOrFail();

    $this->guarantee = PatientGuarantee::create([
        'patient_id' => $this->patient->id, 'his_transaction_id' => 9,
        'guarantor_id' => Guarantor::where('name', 'MAIFIP')->value('id'),
        'reference_no' => 'GL-1', 'guaranteed_on' => '2026-10-06', 'recorded_by' => $this->admin->id,
    ]);
    // An older line: fund source from the merge, no type or mode yet.
    $this->guarantee->items()->create(['fund_source_id' => $this->mayorFund->id, 'amount' => 1000]);

    $this->undoRepeaterFake = Repeater::fake();
});

afterEach(function () {
    ($this->undoRepeaterFake)();
});

function guaranteeRmUser(string $role): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function guaranteeRm(Patient $patient)
{
    return Livewire::test(GuaranteesRelationManager::class, [
        'ownerRecord' => $patient,
        'pageClass' => ViewPatient::class,
    ]);
}

function guaranteeEdit(array $items, array $header = []): array
{
    return [...$header, 'items' => $items];
}

it('lists the patient\'s guarantees with their total', function () {
    actingAs($this->admin);

    guaranteeRm($this->patient)
        ->assertOk()
        ->assertCanSeeTableRecords([$this->guarantee])
        ->assertTableColumnStateSet('items_sum_amount', 1000, $this->guarantee)
        ->assertTableColumnStateSet('items_count', 1, $this->guarantee);
});

it('edits the breakdown with type, amount, mode and fund source through the service', function () {
    actingAs($this->admin);

    guaranteeRm($this->patient)
        ->callTableAction('edit', $this->guarantee, data: guaranteeEdit([
            ['assistant_type_id' => $this->medicines->id, 'amount' => 1500, 'mode_of_assistance_id' => $this->financial->id, 'fund_source_id' => $this->mayorFund->id],
            ['assistant_type_id' => $this->hospitalBill->id, 'amount' => 500, 'mode_of_assistance_id' => $this->financial->id, 'fund_source_id' => $this->othersFund->id, 'others_specify' => 'Church donation'],
        ], ['reference_no' => 'GL-2']))
        ->assertHasNoTableActionErrors();

    $lines = $this->guarantee->refresh()->items()->orderBy('id')->get();

    expect($this->guarantee->reference_no)->toBe('GL-2')
        ->and($lines)->toHaveCount(2)
        ->and($lines[0]->assistant_type_id)->toBe($this->medicines->id)
        ->and($lines[0]->mode_of_assistance_id)->toBe($this->financial->id)
        ->and($lines[0]->fund_source_id)->toBe($this->mayorFund->id)
        ->and((float) $lines[0]->amount)->toBe(1500.0)
        ->and($lines[1]->others_specify)->toBe('Church donation')
        ->and($this->guarantee->total())->toBe(2000.0);
});

it('requires every field of a line, and Specify for an "Others" fund', function () {
    actingAs($this->admin);

    guaranteeRm($this->patient)
        ->callTableAction('edit', $this->guarantee, data: guaranteeEdit([
            ['assistant_type_id' => null, 'amount' => null, 'mode_of_assistance_id' => null, 'fund_source_id' => $this->othersFund->id],
        ]))
        ->assertHasTableActionErrors([
            'items.0.assistant_type_id' => 'required',
            'items.0.amount' => 'required',
            'items.0.mode_of_assistance_id' => 'required',
            'items.0.others_specify' => 'required',
        ]);

    expect($this->guarantee->items()->first()->assistant_type_id)->toBeNull();
});

it('rejects the same Type of Assistance twice', function () {
    actingAs($this->admin);

    $line = ['assistant_type_id' => $this->medicines->id, 'amount' => 100, 'mode_of_assistance_id' => $this->financial->id, 'fund_source_id' => $this->mayorFund->id];

    guaranteeRm($this->patient)
        ->callTableAction('edit', $this->guarantee, data: guaranteeEdit([$line, $line]))
        ->assertHasTableActionErrors(['items.0.assistant_type_id']);
});

it('keeps a retired option the guarantee already uses selectable', function () {
    actingAs($this->admin);
    $this->mayorFund->update(['is_active' => false]);

    guaranteeRm($this->patient)
        ->callTableAction('edit', $this->guarantee, data: guaranteeEdit([
            ['assistant_type_id' => $this->medicines->id, 'amount' => 1000, 'mode_of_assistance_id' => $this->financial->id, 'fund_source_id' => $this->mayorFund->id],
        ]))
        ->assertHasNoTableActionErrors();

    expect($this->guarantee->items()->first()->fund_source_id)->toBe($this->mayorFund->id);
});

it('deletes and restores a guarantee', function () {
    actingAs($this->admin);

    guaranteeRm($this->patient)->callTableAction('delete', $this->guarantee);
    expect(PatientGuarantee::find($this->guarantee->id))->toBeNull();

    guaranteeRm($this->patient)
        ->filterTable('trashed', true)
        ->assertCanSeeTableRecords([$this->guarantee])
        ->callTableAction('restore', $this->guarantee);

    expect(PatientGuarantee::find($this->guarantee->id))->not->toBeNull();
});

it('lets a Supervisor edit but not delete, and offers no create action', function () {
    actingAs(guaranteeRmUser('Supervisor'));

    guaranteeRm($this->patient)
        ->assertTableActionVisible('edit', $this->guarantee)
        ->assertTableActionHidden('delete', $this->guarantee);

    expect((new GuaranteesRelationManager)->canCreate())->toBeFalse();
});

it('hides the tab from users without guarantee.view', function () {
    $user = User::factory()->create();
    $user->givePermissionTo(Permission::findByName('panel.access', 'web'));
    actingAs($user);

    expect(GuaranteesRelationManager::canViewForRecord($this->patient, ViewPatient::class))->toBeFalse();

    actingAs(guaranteeRmUser('Supervisor'));
    expect(GuaranteesRelationManager::canViewForRecord($this->patient, ViewPatient::class))->toBeTrue();
});
