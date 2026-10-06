<?php

use App\Models\AssistanceSource;
use App\Models\Guarantor;
use App\Models\Patient;
use App\Models\PatientGuarantee;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\AssistanceSourceSeeder;
use Database\Seeders\GuarantorSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->seed(GuarantorSeeder::class);
    $this->seed(AssistanceSourceSeeder::class);

    $this->worker = asUser('Case Manager');
    $this->mayor = AssistanceSource::where('code', 'city_mayor')->firstOrFail();

    Sanctum::actingAs($this->worker);
});

function asUser(string $role): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

/** A guarantee with one line of the given type, written straight to the database. */
function asGuaranteeUsing(AssistanceSource $source, User $worker): PatientGuarantee
{
    $patient = Patient::create([
        'sector_id' => Sector::firstOrCreate(['code' => 'MED'], ['name' => 'Medical'])->id,
        'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);

    $guarantee = PatientGuarantee::create([
        'patient_id' => $patient->id, 'his_transaction_id' => 9,
        'guarantor_id' => Guarantor::where('name', 'MAIFIP')->value('id'),
        'guaranteed_on' => '2026-10-06', 'recorded_by' => $worker->id,
    ]);
    $guarantee->items()->create(['assistance_source_id' => $source->id, 'amount' => 1000]);

    return $guarantee;
}

it('adds, renames, retires and deletes a breakdown type', function () {
    $id = $this->postJson('/api/assistance-sources', ['name' => 'Other Funds'])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Other Funds')
        ->assertJsonPath('data.requires_specify', false)
        ->assertJsonPath('data.is_active', true)
        ->assertJsonPath('data.usage_count', 0)
        ->json('data.id');

    $this->putJson("/api/assistance-sources/{$id}", ['name' => 'Other Funds (LGU)', 'code' => 'other_funds'])
        ->assertOk()->assertJsonPath('data.name', 'Other Funds (LGU)')->assertJsonPath('data.code', 'other_funds');

    $this->putJson("/api/assistance-sources/{$id}", ['is_active' => false])
        ->assertOk()->assertJsonPath('data.is_active', false)->assertJsonPath('data.name', 'Other Funds (LGU)');

    $this->deleteJson("/api/assistance-sources/{$id}")->assertNoContent();

    expect(AssistanceSource::withTrashed()->find($id)->trashed())->toBeTrue();
    $this->getJson("/api/assistance-sources/{$id}")->assertNotFound();
});

it('validates a breakdown type', function (array $payload, string $error) {
    $this->postJson('/api/assistance-sources', $payload)
        ->assertUnprocessable()->assertJsonValidationErrors($error);
})->with([
    'missing name' => [['name' => ''], 'name'],
    'name too long' => [['name' => str_repeat('a', 256)], 'name'],
    'duplicate name' => [['name' => 'City Mayor Assistance'], 'name'],
    'duplicate code' => [['name' => 'Mayor Again', 'code' => 'city_mayor'], 'code'],
    'not a boolean' => [['name' => 'X', 'is_active' => 'maybe'], 'is_active'],
]);

it('lets a type keep its own name on update', function () {
    $this->putJson("/api/assistance-sources/{$this->mayor->id}", ['name' => 'City Mayor Assistance', 'code' => 'city_mayor'])
        ->assertOk();
});

it('reuses the name of a deleted type but not its code', function () {
    $this->mayor->delete();

    $this->postJson('/api/assistance-sources', ['name' => 'City Mayor Assistance', 'code' => 'city_mayor'])
        ->assertUnprocessable()->assertJsonValidationErrors('code');

    $this->postJson('/api/assistance-sources', ['name' => 'City Mayor Assistance'])->assertCreated();
});

it('counts the breakdown lines that use a type', function () {
    asGuaranteeUsing($this->mayor, $this->worker);
    asGuaranteeUsing($this->mayor, $this->worker);

    $this->getJson("/api/assistance-sources/{$this->mayor->id}")->assertOk()->assertJsonPath('data.usage_count', 2);

    $listed = collect($this->getJson('/api/assistance-sources')->assertOk()->json('data'))->keyBy('code');
    expect($listed['city_mayor']['usage_count'])->toBe(2)
        ->and($listed['city_council']['usage_count'])->toBe(0);
});

it('keeps a deleted type on existing lines but not on new ones', function () {
    $guarantee = asGuaranteeUsing($this->mayor, $this->worker);

    $this->deleteJson("/api/assistance-sources/{$this->mayor->id}")->assertNoContent();

    $this->getJson("/api/guarantees/{$guarantee->id}")->assertOk()
        ->assertJsonPath('data.items.0.source.name', 'City Mayor Assistance')
        ->assertJsonPath('data.total', 1000);

    $this->putJson("/api/guarantees/{$guarantee->id}", [
        'items' => [['assistance_source_id' => $this->mayor->id, 'amount' => 500]],
    ])->assertUnprocessable()->assertJsonValidationErrors('items.0.assistance_source_id');

    $this->getJson('/api/assistance-sources')->assertOk()->assertJsonMissing(['code' => 'city_mayor']);
});

it('lets anyone with guarantee.create manage the types and everyone else only read them', function () {
    // Case Manager (guarantee.create, not settings.manage) — covered by the other tests; Supervisor too.
    Sanctum::actingAs(asUser('Supervisor'));
    $this->postJson('/api/assistance-sources', ['name' => 'Barangay Fund'])->assertCreated();

    // Processor: guarantee.view only.
    Sanctum::actingAs(asUser('Processor'));
    $this->getJson('/api/assistance-sources')->assertOk();
    $this->getJson("/api/assistance-sources/{$this->mayor->id}")->assertOk();
    $this->postJson('/api/assistance-sources', ['name' => 'Nope'])->assertForbidden();
    $this->putJson("/api/assistance-sources/{$this->mayor->id}", ['name' => 'Nope'])->assertForbidden();
    $this->deleteJson("/api/assistance-sources/{$this->mayor->id}")->assertForbidden();

    expect($this->mayor->refresh()->name)->toBe('City Mayor Assistance');
});

it('rejects unauthenticated writes', function () {
    $this->app['auth']->forgetGuards();

    $this->postJson('/api/assistance-sources', ['name' => 'X'])->assertUnauthorized();
    $this->deleteJson("/api/assistance-sources/{$this->mayor->id}")->assertUnauthorized();
});

it('audits every change to a type', function () {
    $id = $this->postJson('/api/assistance-sources', ['name' => 'Other Funds'])->assertCreated()->json('data.id');
    $this->putJson("/api/assistance-sources/{$id}", ['name' => 'Other Funds (LGU)'])->assertOk();
    $this->deleteJson("/api/assistance-sources/{$id}")->assertNoContent();

    $events = Activity::query()
        ->where('subject_type', AssistanceSource::class)->where('subject_id', $id)
        ->pluck('event')->all();

    expect($events)->toBe(['created', 'updated', 'deleted'])
        ->and(Activity::where('subject_type', AssistanceSource::class)->where('subject_id', $id)->value('causer_id'))
        ->toBe($this->worker->id);
});
