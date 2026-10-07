<?php

use App\Filament\Resources\FundSources\Pages\CreateFundSource;
use App\Models\Assessment;
use App\Models\CaseModel;
use App\Models\FundSource;
use App\Models\Guarantor;
use App\Models\Patient;
use App\Models\PatientGuarantee;
use App\Models\PatientGuaranteeItem;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\FundSourceSeeder;
use Database\Seeders\GuarantorSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Livewire\Livewire;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->seed(GuarantorSeeder::class);

    $this->supervisor = User::factory()->create(['role' => 'Supervisor']);
    $this->supervisor->assignRole('Supervisor');
    Sanctum::actingAs($this->supervisor);
});

function createGuaranteeLine(FundSource $source, ?string $specify = null): PatientGuaranteeItem
{
    $patient = Patient::create([
        'sector_id' => Sector::firstOrCreate(['code' => 'MED'], ['name' => 'Medical'])->id,
        'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
    $guarantee = PatientGuarantee::create([
        'patient_id' => $patient->id, 'his_transaction_id' => 9,
        'guarantor_id' => Guarantor::query()->value('id'),
        'guaranteed_on' => '2026-10-06', 'recorded_by' => User::query()->value('id'),
    ]);

    return $guarantee->items()->create([
        'fund_source_id' => $source->id, 'others_specify' => $specify, 'amount' => 500,
    ]);
}

it('seeds the former assistance sources as fund sources, Others requiring specify', function () {
    expect(FundSource::ordered()->pluck('name', 'code')->all())->toBe(FundSourceSeeder::SOURCES)
        ->and(FundSource::where('code', 'others')->value('requires_specify'))->toBeTrue()
        ->and(FundSource::where('requires_specify', true)->pluck('code')->all())->toBe(['others']);
});

it('sets and returns requires_specify on fund sources only', function () {
    $id = $this->postJson('/api/fund-sources', ['name' => 'Church Fund', 'code' => 'church_fund', 'requires_specify' => true])
        ->assertCreated()
        ->assertJsonPath('data.requires_specify', true)
        ->json('data.id');

    $this->putJson("/api/fund-sources/{$id}", ['requires_specify' => false])->assertOk()->assertJsonPath('data.requires_specify', false);
    $this->putJson("/api/fund-sources/{$id}", ['requires_specify' => 'maybe'])->assertUnprocessable()->assertJsonValidationErrors('requires_specify');

    expect($this->getJson('/api/mode-of-assistances')->json('data.0'))->not->toHaveKey('requires_specify');
});

it('counts assessments and breakdown lines but locks the code only for assessments', function () {
    $mayorFund = FundSource::where('code', 'city_mayor')->firstOrFail();
    $line = createGuaranteeLine($mayorFund);

    $this->getJson("/api/fund-sources/{$mayorFund->id}")
        ->assertOk()
        ->assertJsonPath('data.usage_count', 1)
        ->assertJsonPath('data.usage.guarantee_lines', 1)
        ->assertJsonPath('data.usage.assessments', 0)
        ->assertJsonPath('data.code_locked', false);

    $this->putJson("/api/fund-sources/{$mayorFund->id}", ['code' => 'mayor_fund'])->assertOk();

    $pcso = FundSource::where('code', 'pcso')->firstOrFail();
    $case = CaseModel::create([
        'patient_id' => $line->guarantee->patient_id, 'assigned_user_id' => $this->supervisor->id,
        'case_code' => 'CASE-FS-1', 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'OPD', 'date_opened' => now(),
    ]);
    Assessment::create(['case_id' => $case->id, 'created_by' => $this->supervisor->id, 'classification' => 'C1', 'fund_source' => 'pcso']);

    $this->getJson("/api/fund-sources/{$pcso->id}")
        ->assertJsonPath('data.usage.assessments', 1)
        ->assertJsonPath('data.code_locked', true);
});

it('lets settings managers flag a fund source as requiring specify in the admin panel', function () {
    $admin = User::factory()->create(['role' => 'Admin']);
    $admin->assignRole('Admin');
    actingAs($admin);

    Livewire::test(CreateFundSource::class)
        ->fillForm(['name' => 'Donations', 'code' => 'donations', 'requires_specify' => true, 'is_active' => true])
        ->call('create')
        ->assertHasNoFormErrors();

    expect(FundSource::where('code', 'donations')->value('requires_specify'))->toBeTrue();
});

it('removes the Assistance Sources list now that lines name a fund source', function () {
    expect(Schema::hasTable('assistance_sources'))->toBeFalse()
        ->and(Schema::hasColumn('patient_guarantee_items', 'assistance_source_id'))->toBeFalse()
        ->and(Schema::hasColumn('patient_guarantee_items', 'fund_source_id'))->toBeTrue();

    $this->getJson('/api/assistance-sources')->assertNotFound();
});
