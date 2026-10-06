<?php

use App\Filament\Resources\AssistanceSources\Pages\CreateAssistanceSource;
use App\Filament\Resources\Guarantors\Pages\ListGuarantors;
use App\Models\AssistanceSource;
use App\Models\Bizbox\HospitalPatient;
use App\Models\Bizbox\PatientTransaction;
use App\Models\Guarantor;
use App\Models\Patient;
use App\Models\PatientGuarantee;
use App\Models\PatientGuaranteeItem;
use App\Models\Sector;
use App\Models\User;
use App\Repositories\Contracts\PatientTransactionRepositoryInterface;
use App\Services\PatientMergeService;
use Database\Seeders\AssistanceSourceSeeder;
use Database\Seeders\GuarantorSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Livewire\Livewire;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->seed(GuarantorSeeder::class);
    $this->seed(AssistanceSourceSeeder::class);

    $this->worker = pgUser('MSS Head');
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id, 'hospital_id' => 777,
        'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);

    $this->maifip = Guarantor::where('name', 'MAIFIP')->firstOrFail();
    $this->mayor = AssistanceSource::where('code', 'city_mayor')->firstOrFail();
    $this->council = AssistanceSource::where('code', 'city_council')->firstOrFail();
    $this->congress = AssistanceSource::where('code', 'congressional')->firstOrFail();
    $this->others = AssistanceSource::where('code', 'others')->firstOrFail();

    pgMockEncounter(patid: 777);
    Sanctum::actingAs($this->worker);
});

function pgUser(string $role): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

/** Makes the HIS lookup return an encounter of the given hospital patient (no sqlsrv). */
function pgMockEncounter(int $patid, int $key = 9): void
{
    $transaction = (new PatientTransaction)->forceFill(['PK_psPatRegisters' => $key, 'FK_emdPatients' => 5]);
    $transaction->setRelation('patient', (new HospitalPatient)->forceFill(['PK_emdPatients' => 5, 'patid' => $patid]));

    test()->mock(PatientTransactionRepositoryInterface::class, function ($mock) use ($transaction) {
        $mock->shouldReceive('find')->andReturn($transaction);
    });
}

function pgPayload(array $overrides = []): array
{
    return array_merge([
        'his_transaction_id' => 9,
        'guarantor_id' => test()->maifip->id,
        'reference_no' => 'GL-2026-001',
        'guaranteed_on' => '2026-10-06',
        'remarks' => 'Endorsed',
        'items' => [
            ['assistance_source_id' => test()->mayor->id, 'amount' => 1000],
            ['assistance_source_id' => test()->council->id, 'amount' => 1000],
            ['assistance_source_id' => test()->congress->id, 'amount' => 1000],
        ],
    ], $overrides);
}

function pgStore(Patient $patient): string
{
    return "/api/patients/{$patient->id}/guarantees";
}

function pgCreate(array $overrides = []): int
{
    return test()->postJson(pgStore(test()->patient), pgPayload($overrides))->assertCreated()->json('data.id');
}

it('records a guarantor with its breakdown and totals the lines', function () {
    $response = $this->postJson(pgStore($this->patient), pgPayload())->assertCreated();

    $response->assertJsonPath('data.guarantor.name', 'MAIFIP')
        ->assertJsonPath('data.his_transaction_id', 9)
        ->assertJsonPath('data.hospital_id', 777)
        ->assertJsonPath('data.reference_no', 'GL-2026-001')
        ->assertJsonPath('data.guaranteed_on', '2026-10-06')
        ->assertJsonPath('data.total', 3000)
        ->assertJsonPath('data.recorded_by.id', $this->worker->id)
        ->assertJsonCount(3, 'data.items')
        ->assertJsonPath('data.items.0.source.name', 'City Mayor Assistance')
        ->assertJsonPath('data.items.0.amount', 1000);

    $guarantee = PatientGuarantee::findOrFail($response->json('data.id'));
    expect($guarantee->patient_id)->toBe($this->patient->id)
        ->and($guarantee->items()->count())->toBe(3);
});

it('ignores a total sent in the body', function () {
    $this->postJson(pgStore($this->patient), pgPayload(['total' => 99999]))
        ->assertCreated()->assertJsonPath('data.total', 3000);
});

it('lists the patient\'s guarantees with a grand total, optionally for one encounter', function () {
    pgCreate();
    pgCreate(['guarantor_id' => Guarantor::where('name', 'PCSO')->value('id'), 'items' => [
        ['assistance_source_id' => $this->mayor->id, 'amount' => 500.50],
    ]]);

    $this->getJson(pgStore($this->patient))->assertOk()
        ->assertJsonCount(2, 'data')->assertJsonPath('grand_total', 3500.5);

    $this->getJson(pgStore($this->patient).'?transaction=9')->assertOk()->assertJsonCount(2, 'data');
    $this->getJson(pgStore($this->patient).'?transaction=10')->assertOk()
        ->assertJsonCount(0, 'data')->assertJsonPath('grand_total', 0);
});

it('rejects an invalid breakdown', function (array $overrides, string $error) {
    $this->postJson(pgStore($this->patient), pgPayload($overrides))
        ->assertUnprocessable()->assertJsonValidationErrors($error);
})->with([
    'no lines' => [['items' => []], 'items'],
    'zero amount' => [['items' => [['assistance_source_id' => 1, 'amount' => 0]]], 'items.0.amount'],
    'negative amount' => [['items' => [['assistance_source_id' => 1, 'amount' => -5]]], 'items.0.amount'],
    'unknown source' => [['items' => [['assistance_source_id' => 9999, 'amount' => 10]]], 'items.0.assistance_source_id'],
    'missing guarantor' => [['guarantor_id' => null], 'guarantor_id'],
    'missing date' => [['guaranteed_on' => null], 'guaranteed_on'],
    'missing encounter' => [['his_transaction_id' => null], 'his_transaction_id'],
]);

it('rejects the same source twice in one breakdown', function () {
    $this->postJson(pgStore($this->patient), pgPayload(['items' => [
        ['assistance_source_id' => $this->mayor->id, 'amount' => 100],
        ['assistance_source_id' => $this->mayor->id, 'amount' => 200],
    ]]))->assertUnprocessable()->assertJsonValidationErrors('items.1.assistance_source_id');
});

it('requires a specify value for an "Others" line', function () {
    $this->postJson(pgStore($this->patient), pgPayload(['items' => [
        ['assistance_source_id' => $this->others->id, 'amount' => 100],
    ]]))->assertUnprocessable()->assertJsonValidationErrors('items.0.others_specify');

    $this->postJson(pgStore($this->patient), pgPayload(['items' => [
        ['assistance_source_id' => $this->others->id, 'amount' => 100, 'others_specify' => 'Barangay Captain'],
    ]]))->assertCreated()->assertJsonPath('data.items.0.others_specify', 'Barangay Captain');
});

it('rejects an inactive guarantor or source', function () {
    $this->maifip->update(['is_active' => false]);
    $this->postJson(pgStore($this->patient), pgPayload())
        ->assertUnprocessable()->assertJsonValidationErrors('guarantor_id');

    $this->maifip->update(['is_active' => true]);
    $this->mayor->update(['is_active' => false]);
    $this->postJson(pgStore($this->patient), pgPayload())
        ->assertUnprocessable()->assertJsonValidationErrors('items.0.assistance_source_id');
});

it('rejects an encounter of a different patient', function () {
    pgMockEncounter(patid: 778);

    $this->postJson(pgStore($this->patient), pgPayload())
        ->assertUnprocessable()->assertJsonValidationErrors('his_transaction_id');

    expect(PatientGuarantee::count())->toBe(0);
});

it('rejects a patient without a hospital record', function () {
    $this->patient->update(['hospital_id' => null]);

    $this->postJson(pgStore($this->patient), pgPayload())
        ->assertUnprocessable()->assertJsonValidationErrors('his_transaction_id');
});

it('rejects an encounter the HIS does not have', function () {
    test()->mock(PatientTransactionRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('find')->andReturn(null);
    });

    $this->postJson(pgStore($this->patient), pgPayload())
        ->assertUnprocessable()->assertJsonValidationErrors('his_transaction_id');
});

it('updates the header and replaces the breakdown', function () {
    $id = pgCreate();

    $this->putJson("/api/guarantees/{$id}", [
        'reference_no' => 'GL-2026-002',
        'items' => [['assistance_source_id' => $this->council->id, 'amount' => 2500]],
    ])->assertOk()
        ->assertJsonPath('data.reference_no', 'GL-2026-002')
        ->assertJsonPath('data.guarantor.name', 'MAIFIP')
        ->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.total', 2500);

    expect(PatientGuaranteeItem::where('patient_guarantee_id', $id)->count())->toBe(1);
});

it('keeps the breakdown when items are not sent', function () {
    $id = pgCreate();

    $this->putJson("/api/guarantees/{$id}", ['remarks' => 'Corrected'])->assertOk()
        ->assertJsonPath('data.remarks', 'Corrected')->assertJsonPath('data.total', 3000);
});

it('does not move a guarantee to another encounter', function () {
    $id = pgCreate();

    $this->putJson("/api/guarantees/{$id}", ['his_transaction_id' => 10])
        ->assertUnprocessable()->assertJsonValidationErrors('his_transaction_id');
});

it('shows and soft-deletes a guarantee', function () {
    $id = pgCreate();

    $this->getJson("/api/guarantees/{$id}")->assertOk()->assertJsonPath('data.total', 3000);
    $this->deleteJson("/api/guarantees/{$id}")->assertNoContent();

    expect(PatientGuarantee::withTrashed()->find($id)->trashed())->toBeTrue();
    $this->getJson(pgStore($this->patient))->assertOk()->assertJsonCount(0, 'data');
    $this->getJson("/api/guarantees/{$id}")->assertNotFound();
});

it('enforces each guarantee permission separately', function () {
    $id = pgCreate();

    // Processor: view only.
    Sanctum::actingAs(pgUser('Processor'));
    $this->getJson(pgStore($this->patient))->assertOk();
    $this->getJson("/api/guarantees/{$id}")->assertOk();
    $this->postJson(pgStore($this->patient), pgPayload())->assertForbidden();
    $this->putJson("/api/guarantees/{$id}", ['remarks' => 'x'])->assertForbidden();
    $this->deleteJson("/api/guarantees/{$id}")->assertForbidden();

    // Case Manager: view, create, update — not delete.
    Sanctum::actingAs(pgUser('Case Manager'));
    $this->postJson(pgStore($this->patient), pgPayload())->assertCreated();
    $this->putJson("/api/guarantees/{$id}", ['remarks' => 'ok'])->assertOk();
    $this->deleteJson("/api/guarantees/{$id}")->assertForbidden();

    // No guarantee permission at all.
    Sanctum::actingAs(User::factory()->create());
    $this->getJson(pgStore($this->patient))->assertForbidden();
});

it('rejects unauthenticated requests', function () {
    $this->app['auth']->forgetGuards();

    $this->getJson(pgStore($this->patient))->assertUnauthorized();
    $this->postJson(pgStore($this->patient), pgPayload())->assertUnauthorized();
});

it('moves guarantees with a patient merge and back on unmerge', function () {
    $source = Patient::create(['sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes ', 'sex' => 'female']);
    $guarantee = PatientGuarantee::create([
        'patient_id' => $source->id, 'his_transaction_id' => 9, 'guarantor_id' => $this->maifip->id,
        'guaranteed_on' => '2026-10-06', 'recorded_by' => $this->worker->id,
    ]);

    $merge = app(PatientMergeService::class);
    $merge->merge($source, $this->patient, $this->worker);
    expect($guarantee->refresh()->patient_id)->toBe($this->patient->id);

    $merge->reverse($merge->latestActiveMergeInto($this->patient), $this->worker);
    expect($guarantee->refresh()->patient_id)->toBe($source->id);
});

it('audits the guarantee and its lines against the patient and no case', function () {
    $id = pgCreate();

    $rows = Activity::query()
        ->where(fn ($query) => $query
            ->where(fn ($q) => $q->where('subject_type', PatientGuarantee::class)->where('subject_id', $id))
            ->orWhere('subject_type', PatientGuaranteeItem::class))
        ->get();

    expect($rows->where('subject_type', PatientGuarantee::class))->not->toBeEmpty()
        ->and($rows->where('subject_type', PatientGuaranteeItem::class))->toHaveCount(3)
        ->and($rows->pluck('patient_id')->unique()->all())->toBe([$this->patient->id])
        ->and($rows->pluck('case_id')->filter()->all())->toBe([]);
});

it('lists assistance sources, hiding retired ones on request', function () {
    $this->others->update(['is_active' => false]);

    $this->getJson('/api/assistance-sources')->assertOk()->assertJsonCount(6, 'data');
    $this->getJson('/api/assistance-sources?active=1')->assertOk()->assertJsonCount(5, 'data')
        ->assertJsonMissing(['code' => 'others']);
    $this->getJson("/api/assistance-sources/{$this->mayor->id}")->assertOk()
        ->assertJsonPath('data.name', 'City Mayor Assistance');
});

it('seeds the lookups idempotently', function () {
    $this->seed(GuarantorSeeder::class);
    $this->seed(AssistanceSourceSeeder::class);

    expect(Guarantor::count())->toBe(3)
        ->and(AssistanceSource::count())->toBe(6)
        ->and(AssistanceSource::where('requires_specify', true)->pluck('code')->all())->toBe(['others']);
});

it('adds the guarantee permissions to existing roles through its migration', function () {
    // An environment from before this module: no guarantee.* permissions or grants.
    Permission::where('name', 'like', 'guarantee.%')->get()->each->delete();
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    $migration = require database_path('migrations/2026_10_08_010200_add_guarantee_permissions.php');
    $migration->up();
    $migration->up(); // idempotent

    expect(Permission::where('name', 'like', 'guarantee.%')->count())->toBe(4)
        ->and(Role::findByName('Admin', 'web')->hasPermissionTo('guarantee.delete'))->toBeTrue()
        ->and(Role::findByName('Case Manager', 'web')->hasPermissionTo('guarantee.update'))->toBeTrue()
        ->and(Role::findByName('Case Manager', 'web')->hasPermissionTo('guarantee.delete'))->toBeFalse()
        ->and(Role::findByName('Processor', 'web')->hasPermissionTo('guarantee.view'))->toBeTrue()
        ->and(Role::findByName('Processor', 'web')->hasPermissionTo('guarantee.create'))->toBeFalse();
});

it('lets settings managers maintain the lookups in the admin panel', function () {
    actingAs(pgUser('Admin'));

    Livewire::test(ListGuarantors::class)->assertOk()->assertCanSeeTableRecords(Guarantor::all());

    Livewire::test(CreateAssistanceSource::class)
        ->fillForm(['name' => 'Vice Mayor Assistance', 'code' => 'vice_mayor', 'is_active' => true])
        ->call('create')
        ->assertHasNoFormErrors();

    expect(AssistanceSource::where('code', 'vice_mayor')->exists())->toBeTrue();
});
