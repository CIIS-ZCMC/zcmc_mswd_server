<?php

use App\Models\Assessment;
use App\Models\CaseModel;
use App\Models\FundSource;
use App\Models\Guarantor;
use App\Models\ModeOfAssistance;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\GuarantorSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->seed(GuarantorSeeder::class);

    Sanctum::actingAs(libraryUser('Supervisor'));
});

function libraryUser(string $role): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

/** An assessment that stores the given code, written straight to the database. */
function assessmentStoring(string $column, string $code): Assessment
{
    $worker = User::query()->firstOrFail();
    $patient = Patient::create([
        'sector_id' => Sector::firstOrCreate(['code' => 'MED'], ['name' => 'Medical'])->id,
        'first_name' => 'Juan', 'last_name' => 'Dela Cruz', 'sex' => 'male',
    ]);
    $case = CaseModel::create([
        'patient_id' => $patient->id, 'assigned_user_id' => $worker->id,
        'case_code' => 'CASE-LIB-'.Str::random(6), 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'OPD', 'date_opened' => now(),
    ]);

    return Assessment::create(['case_id' => $case->id, 'created_by' => $worker->id, 'classification' => 'C1', $column => $code]);
}

dataset('lookups', [
    'modes of assistance' => ['mode-of-assistances', ModeOfAssistance::class, 'recommendation_mode'],
    'fund sources' => ['fund-sources', FundSource::class, 'fund_source'],
]);

// ── Modes of assistance and fund sources ─────────────────────────────────────

it('lists the seeded rows in sort order', function (string $uri, string $model) {
    $codes = $this->getJson("/api/{$uri}")->assertOk()->json('data.*.code');

    expect($codes)->toBe($model::ordered()->pluck('code')->all());
})->with('lookups');

it('adds, renames, reorders, retires and deletes a row', function (string $uri, string $model) {
    $id = $this->postJson("/api/{$uri}", ['name' => 'City Hall', 'code' => 'city_hall', 'sort_order' => 3])
        ->assertCreated()
        ->assertJsonPath('data.name', 'City Hall')
        ->assertJsonPath('data.code', 'city_hall')
        ->assertJsonPath('data.is_active', true)
        ->assertJsonPath('data.sort_order', 3)
        ->assertJsonPath('data.usage_count', 0)
        ->json('data.id');

    $this->putJson("/api/{$uri}/{$id}", ['name' => 'City Hall Fund', 'sort_order' => 1])
        ->assertOk()->assertJsonPath('data.name', 'City Hall Fund')->assertJsonPath('data.sort_order', 1);

    $this->putJson("/api/{$uri}/{$id}", ['is_active' => false])->assertOk()->assertJsonPath('data.is_active', false);

    expect($this->getJson("/api/{$uri}?active=1")->json('data.*.code'))->not->toContain('city_hall');

    $this->deleteJson("/api/{$uri}/{$id}")->assertNoContent();

    expect($model::withTrashed()->find($id)->trashed())->toBeTrue();
    $this->getJson("/api/{$uri}/{$id}")->assertNotFound();
})->with('lookups');

it('validates a row', function (string $uri, string $model, string $column, array $payload, string $error) {
    $this->postJson("/api/{$uri}", $payload)->assertUnprocessable()->assertJsonValidationErrors($error);
})->with('lookups')->with([
    'missing name' => [['code' => 'x'], 'name'],
    'missing code' => [['name' => 'X'], 'code'],
    'code with spaces' => [['name' => 'X', 'code' => 'two words'], 'code'],
    'upper-case code' => [['name' => 'X', 'code' => 'ABC'], 'code'],
    'negative sort order' => [['name' => 'X', 'code' => 'x', 'sort_order' => -1], 'sort_order'],
]);

it('rejects a duplicate name or code', function (string $uri, string $model) {
    $existing = $model::ordered()->first();

    $this->postJson("/api/{$uri}", ['name' => $existing->name, 'code' => 'fresh'])
        ->assertUnprocessable()->assertJsonValidationErrors('name');
    $this->postJson("/api/{$uri}", ['name' => 'Fresh', 'code' => $existing->code])
        ->assertUnprocessable()->assertJsonValidationErrors('code');
})->with('lookups');

it('reuses the name of a deleted row but not its code', function (string $uri, string $model) {
    $row = $model::create(['name' => 'Retired', 'code' => 'retired']);
    $row->delete();

    $this->postJson("/api/{$uri}", ['name' => 'Retired', 'code' => 'retired_again'])->assertCreated();
    $this->postJson("/api/{$uri}", ['name' => 'Another', 'code' => 'retired'])
        ->assertUnprocessable()->assertJsonValidationErrors('code');
})->with('lookups');

it('counts the assessments that store a code and locks the code while used', function (string $uri, string $model, string $column) {
    $row = $model::create(['name' => 'Used', 'code' => 'used_code']);
    assessmentStoring($column, 'used_code');

    $this->getJson("/api/{$uri}/{$row->id}")->assertOk()->assertJsonPath('data.usage_count', 1);

    $this->putJson("/api/{$uri}/{$row->id}", ['code' => 'renamed_code'])
        ->assertUnprocessable()->assertJsonValidationErrors('code');
    $this->putJson("/api/{$uri}/{$row->id}", ['code' => 'used_code', 'name' => 'Still Used'])->assertOk();
})->with('lookups');

it('lets an unused row change its code', function (string $uri, string $model) {
    $row = $model::create(['name' => 'Unused', 'code' => 'unused']);

    $this->putJson("/api/{$uri}/{$row->id}", ['code' => 'still_unused'])->assertOk()->assertJsonPath('data.code', 'still_unused');
})->with('lookups');

it('lets library.manage write and everyone else only read', function (string $uri) {
    Sanctum::actingAs(libraryUser('Case Manager'));

    $this->getJson("/api/{$uri}")->assertOk();
    $this->postJson("/api/{$uri}", ['name' => 'X', 'code' => 'x'])->assertForbidden();

    Sanctum::actingAs(libraryUser('MSS Head'));
    $this->postJson("/api/{$uri}", ['name' => 'X', 'code' => 'x'])->assertCreated();
})->with('lookups');

it('rejects unauthenticated writes', function (string $uri) {
    $this->app['auth']->forgetGuards();

    $this->postJson("/api/{$uri}", ['name' => 'X', 'code' => 'x'])->assertUnauthorized();
})->with('lookups');

it('audits every change to a row', function (string $uri, string $model) {
    $id = $this->postJson("/api/{$uri}", ['name' => 'Audited', 'code' => 'audited'])->json('data.id');
    $this->putJson("/api/{$uri}/{$id}", ['name' => 'Audited Again']);
    $this->deleteJson("/api/{$uri}/{$id}");

    expect(Activity::where('subject_type', (new $model)->getMorphClass())->where('subject_id', $id)->pluck('event')->all())
        ->toBe(['created', 'updated', 'deleted']);
})->with('lookups');

// ── Guarantors ───────────────────────────────────────────────────────────────

it('adds, renames, retires and deletes a guarantor', function () {
    $id = $this->postJson('/api/guarantors', ['name' => 'Malasakit Center', 'address' => 'Zamboanga City'])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Malasakit Center')
        ->assertJsonPath('data.address', 'Zamboanga City')
        ->assertJsonPath('data.is_active', true)
        ->assertJsonPath('data.usage_count', 0)
        ->json('data.id');

    $this->putJson("/api/guarantors/{$id}", ['name' => 'Malasakit'])->assertOk()->assertJsonPath('data.name', 'Malasakit');
    $this->putJson("/api/guarantors/{$id}", ['is_active' => false])->assertOk()->assertJsonPath('data.is_active', false);

    expect($this->getJson('/api/guarantors?active=1')->json('data.*.name'))->not->toContain('Malasakit');

    $this->deleteJson("/api/guarantors/{$id}")->assertNoContent();

    expect(Guarantor::withTrashed()->find($id)->trashed())->toBeTrue();
});

it('validates a guarantor', function () {
    $this->postJson('/api/guarantors', ['name' => ''])->assertUnprocessable()->assertJsonValidationErrors('name');
    $this->postJson('/api/guarantors', ['name' => 'PCSO'])->assertUnprocessable()->assertJsonValidationErrors('name');

    $pcso = Guarantor::where('name', 'PCSO')->firstOrFail();
    $this->putJson("/api/guarantors/{$pcso->id}", ['name' => 'PCSO', 'address' => 'Manila'])->assertOk();
});

it('lets guarantee.create manage guarantors and everyone else only read them', function () {
    Sanctum::actingAs(libraryUser('Processor'));

    $this->getJson('/api/guarantors')->assertOk();
    $this->postJson('/api/guarantors', ['name' => 'X'])->assertForbidden();

    Sanctum::actingAs(libraryUser('Case Manager'));
    $this->postJson('/api/guarantors', ['name' => 'X'])->assertCreated();
});

it('audits every change to a guarantor', function () {
    $id = $this->postJson('/api/guarantors', ['name' => 'Audited'])->json('data.id');
    $this->putJson("/api/guarantors/{$id}", ['address' => 'Somewhere']);
    $this->deleteJson("/api/guarantors/{$id}");

    expect(Activity::where('subject_type', (new Guarantor)->getMorphClass())->where('subject_id', $id)->pluck('event')->all())
        ->toBe(['created', 'updated', 'deleted']);
});
