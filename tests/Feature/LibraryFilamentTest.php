<?php

use App\Filament\Resources\AssistanceSources\Pages\EditAssistanceSource;
use App\Filament\Resources\AssistanceSources\Pages\ListAssistanceSources;
use App\Filament\Resources\FundSources\Pages\CreateFundSource;
use App\Filament\Resources\FundSources\Pages\EditFundSource;
use App\Filament\Resources\FundSources\Pages\ListFundSources;
use App\Filament\Resources\Guarantors\Pages\EditGuarantor;
use App\Filament\Resources\Guarantors\Pages\ListGuarantors;
use App\Filament\Resources\ModeOfAssistances\Pages\CreateModeOfAssistance;
use App\Filament\Resources\ModeOfAssistances\Pages\EditModeOfAssistance;
use App\Filament\Resources\ModeOfAssistances\Pages\ListModeOfAssistances;
use App\Models\Assessment;
use App\Models\AssistanceSource;
use App\Models\CaseModel;
use App\Models\FundSource;
use App\Models\Guarantor;
use App\Models\ModeOfAssistance;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\AssistanceSourceSeeder;
use Database\Seeders\GuarantorSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Filament\Actions\DeleteAction;
use Filament\Actions\Testing\TestAction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->seed(GuarantorSeeder::class);
    $this->seed(AssistanceSourceSeeder::class);

    $this->admin = User::factory()->create(['role' => 'Admin']);
    $this->admin->assignRole('Admin');
    actingAs($this->admin);
});

/** An assessment storing the given code, so the lookup row counts as used. */
function usedBy(string $column, string $code): void
{
    $patient = Patient::create([
        'sector_id' => Sector::firstOrCreate(['code' => 'MED'], ['name' => 'Medical'])->id,
        'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
    $case = CaseModel::create([
        'patient_id' => $patient->id, 'assigned_user_id' => User::query()->firstOrFail()->id,
        'case_code' => 'CASE-FIL-1', 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'OPD', 'date_opened' => now(),
    ]);

    Assessment::create(['case_id' => $case->id, 'created_by' => User::query()->firstOrFail()->id, 'classification' => 'C1', $column => $code]);
}

dataset('assessment lookups', [
    'modes of assistance' => [ListModeOfAssistances::class, CreateModeOfAssistance::class, EditModeOfAssistance::class, ModeOfAssistance::class, 'recommendation_mode', 'counseling'],
    'fund sources' => [ListFundSources::class, CreateFundSource::class, EditFundSource::class, FundSource::class, 'fund_source', 'pcso'],
]);

it('lists the seeded rows with how many assessments use them', function (string $list, string $create, string $edit, string $model, string $column, string $code) {
    usedBy($column, $code);

    Livewire::test($list)
        ->assertOk()
        ->assertCanSeeTableRecords($model::ordered()->get())
        ->assertTableColumnStateSet('usage_count', 1, $model::where('code', $code)->firstOrFail());
})->with('assessment lookups');

it('creates, edits and retires a row', function (string $list, string $create, string $edit, string $model) {
    Livewire::test($create)
        ->fillForm(['name' => 'Barangay Fund', 'code' => 'barangay_fund', 'sort_order' => 9, 'is_active' => true])
        ->call('create')
        ->assertHasNoFormErrors();

    $row = $model::where('code', 'barangay_fund')->firstOrFail();

    Livewire::test($edit, ['record' => $row->getRouteKey()])
        ->fillForm(['name' => 'Barangay Aid', 'is_active' => false])
        ->call('save')
        ->assertHasNoFormErrors();

    expect($row->fresh()->name)->toBe('Barangay Aid')
        ->and($row->fresh()->is_active)->toBeFalse();
})->with('assessment lookups');

it('validates the name and code', function (string $list, string $create, string $edit, string $model) {
    $existing = $model::ordered()->firstOrFail();

    Livewire::test($create)
        ->fillForm(['name' => $existing->name, 'code' => $existing->code])
        ->call('create')
        ->assertHasFormErrors(['name' => 'unique', 'code' => 'unique']);

    Livewire::test($create)
        ->fillForm(['name' => 'Fresh', 'code' => 'Two Words'])
        ->call('create')
        ->assertHasFormErrors(['code' => 'regex']);
})->with('assessment lookups');

it('locks the code once an assessment uses it', function (string $list, string $create, string $edit, string $model, string $column, string $code) {
    $row = $model::where('code', $code)->firstOrFail();
    usedBy($column, $code);

    Livewire::test($edit, ['record' => $row->getRouteKey()])
        ->assertFormFieldIsDisabled('code')
        ->fillForm(['name' => 'Renamed'])
        ->call('save')
        ->assertHasNoFormErrors();

    expect($row->fresh()->name)->toBe('Renamed')
        ->and($row->fresh()->code)->toBe($code);
})->with('assessment lookups');

it('leaves the code editable while nothing uses it', function (string $list, string $create, string $edit, string $model) {
    $row = $model::create(['name' => 'Unused', 'code' => 'unused']);

    Livewire::test($edit, ['record' => $row->getRouteKey()])->assertFormFieldIsEnabled('code');
})->with('assessment lookups');

it('deletes a row and restores it from the trashed filter', function (string $list, string $create, string $edit, string $model) {
    $row = $model::create(['name' => 'Short Lived', 'code' => 'short_lived']);

    Livewire::test($edit, ['record' => $row->getRouteKey()])
        ->callAction(DeleteAction::class)
        ->assertNotified();

    expect($model::find($row->id))->toBeNull()
        ->and($model::withTrashed()->find($row->id)->trashed())->toBeTrue();

    Livewire::test($list)
        ->assertCanNotSeeTableRecords([$row])
        ->filterTable('trashed', true)
        ->assertCanSeeTableRecords([$row])
        ->callAction(TestAction::make('restore')->table($row))
        ->assertNotified();

    expect($model::find($row->id))->not->toBeNull();
})->with('assessment lookups');

it('keeps the lookups away from users without settings.manage', function (string $list, string $create) {
    $worker = User::factory()->create(['role' => 'Case Manager']);
    $worker->assignRole('Case Manager');
    actingAs($worker);

    Livewire::test($list)->assertForbidden();
    Livewire::test($create)->assertForbidden();
})->with('assessment lookups');

it('restores a deleted guarantor and breakdown type from their edit pages', function () {
    $guarantor = Guarantor::where('name', 'PCSO')->firstOrFail();
    $guarantor->delete();

    Livewire::test(ListGuarantors::class)
        ->assertCanNotSeeTableRecords([$guarantor])
        ->filterTable('trashed', true)
        ->assertCanSeeTableRecords([$guarantor]);

    Livewire::test(EditGuarantor::class, ['record' => $guarantor->getRouteKey()])
        ->assertOk()
        ->callAction('restore');

    expect(Guarantor::find($guarantor->id))->not->toBeNull();

    $source = AssistanceSource::where('code', 'city_mayor')->firstOrFail();
    $source->delete();

    Livewire::test(ListAssistanceSources::class)
        ->assertCanNotSeeTableRecords([$source])
        ->filterTable('trashed', true)
        ->assertCanSeeTableRecords([$source]);

    Livewire::test(EditAssistanceSource::class, ['record' => $source->getRouteKey()])
        ->assertOk()
        ->callAction('restore');

    expect(AssistanceSource::find($source->id))->not->toBeNull();
});
