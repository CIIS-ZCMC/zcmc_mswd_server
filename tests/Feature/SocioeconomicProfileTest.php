<?php

use App\Models\Patient;
use App\Models\PatientFamilyMember;
use App\Models\PatientSocioeconomicProfile;
use App\Models\Sector;
use App\Models\User;
use App\Services\PatientMergeService;
use App\Support\UisExpenseSlots;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->worker = seUser('MSS Head');
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
        'occupation' => 'Vendor', 'monthly_income' => 3000, 'educational_attainment' => 'High School',
    ]);

    Sanctum::actingAs($this->worker);
});

function seUser(string $role): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function seProfile(Patient $patient, User $worker, array $overrides = []): PatientSocioeconomicProfile
{
    return PatientSocioeconomicProfile::create(array_merge([
        'patient_id' => $patient->id, 'recorded_on' => now()->toDateString(), 'recorded_by' => $worker->id,
        'total_family_income' => 10000, 'household_size' => 1, 'net_per_capita_income' => 10000,
    ], $overrides));
}

function sePayload(array $overrides = []): array
{
    return array_merge([
        'recorded_on' => now()->toDateString(),
        'total_family_income' => 12000,
        'other_income_sources' => [['source' => 'Remittance', 'amount' => 2000]],
        'house_tenure' => 'rented', 'housing_type' => 'Concrete',
        'light_source' => ['electricity'], 'water_source' => ['public'],
        'utilities_access' => 'Piped water', 'remarks' => 'Stable',
        'expenses' => [
            ['expense_type' => 'Food', 'amount' => 3000],
            ['expense_type' => 'House help', 'amount' => 400],
            ['expense_type' => 'Pets', 'amount' => 1000], // matches no ANNEX B slot
        ],
    ], $overrides);
}

function seOverview(Patient $patient): string
{
    return "/api/patients/{$patient->id}/socioeconomic";
}

function seStore(Patient $patient): string
{
    return "/api/patients/{$patient->id}/socioeconomic-profiles";
}

it('works for a patient who has no cases at all', function () {
    expect($this->patient->cases()->count())->toBe(0);

    $this->getJson(seOverview($this->patient))->assertOk()
        ->assertJsonPath('data.current', null)->assertJsonPath('data.history', []);

    $id = $this->postJson(seStore($this->patient), sePayload())->assertCreated()->json('data.id');

    $this->getJson(seOverview($this->patient))->assertOk()->assertJsonPath('data.current.id', $id);

    $this->putJson("/api/socioeconomic-profiles/{$id}", ['remarks' => 'Corrected'])
        ->assertOk()->assertJsonPath('data.remarks', 'Corrected');

    $this->deleteJson("/api/socioeconomic-profiles/{$id}")->assertNoContent();

    $this->getJson(seOverview($this->patient))->assertJsonPath('data.current', null);
});

it('records a profile with nested expenses, the household snapshot and per-capita income', function () {
    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Pedro', 'monthly_income' => 5000]);
    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Lita']);

    $data = $this->postJson(seStore($this->patient), sePayload())->assertCreated()->json('data');

    expect($data['household_size'])->toBe(3)
        ->and($data['recorded_by']['id'])->toBe($this->worker->id)
        ->and($data['income']['total_family_income'])->toEqual(12000)
        ->and($data['income']['net_per_capita_income'])->toEqual(2533.33) // (12000 - 4400) / 3
        ->and($data['income']['other_income_sources'][0]['source'])->toBe('Remittance')
        ->and($data['living'])->toMatchArray([
            'house_tenure' => 'rented', 'housing_type' => 'Concrete', 'utilities_access' => 'Piped water',
            'light_source' => ['electricity'], 'water_source' => ['public'],
        ])
        ->and($data['expenses']['lines'])->toHaveCount(3)
        ->and($data['expenses']['total'])->toEqual(4400) // the unmatched line counts
        ->and($data['expenses']['expense_to_income_ratio'])->toEqual(0.37)
        ->and($data['expenses']['slots'])->toEqual(UisExpenseSlots::slots(
            PatientSocioeconomicProfile::find($data['id'])->expenses,
        ))
        ->and($data['expenses']['slots']['house_help'])->toEqual(400)
        ->and($data['expenses']['slots']['housing'])->toBeNull()
        ->and($data['household_changed'])->toBeFalse();
});

it('floors per-capita income at zero and leaves the ratio null without income', function () {
    $broke = $this->postJson(seStore($this->patient), sePayload([
        'total_family_income' => 1000, 'expenses' => [['expense_type' => 'Food', 'amount' => 5000]],
    ]))->assertCreated()->json('data');

    expect($broke['income']['net_per_capita_income'])->toEqual(0);

    $noIncome = $this->postJson(seStore($this->patient), sePayload(['total_family_income' => null]))
        ->assertCreated()->json('data');

    expect($noIncome['income']['net_per_capita_income'])->toBeNull()
        ->and($noIncome['expenses']['expense_to_income_ratio'])->toBeNull();
});

it('takes the newest dated record as current and lists the history newest first, capped', function () {
    foreach (range(1, 12) as $i) {
        seProfile($this->patient, $this->worker, [
            'recorded_on' => now()->subDays(20 - $i)->toDateString(), 'total_family_income' => 1000 * $i,
        ]);
    }

    $data = $this->getJson(seOverview($this->patient))->assertOk()->json('data');

    expect($data['history'])->toHaveCount(10)
        ->and($data['history'][0]['total_family_income'])->toEqual(12000)
        ->and($data['history'][9]['total_family_income'])->toEqual(3000)
        ->and($data['current']['income']['total_family_income'])->toEqual(12000);
});

it('breaks a same-day tie by the newest id', function () {
    $first = seProfile($this->patient, $this->worker);
    $second = seProfile($this->patient, $this->worker);

    $this->getJson(seOverview($this->patient))->assertJsonPath('data.current.id', $second->id)
        ->assertJsonPath('data.history.1.id', $first->id);
});

it('flags household_changed when the family changed since the record', function () {
    $id = $this->postJson(seStore($this->patient), sePayload())->assertCreated()->json('data.id');

    expect($this->getJson(seOverview($this->patient))->json('data.current.household_changed'))->toBeFalse();

    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Pedro']);

    $overview = $this->getJson(seOverview($this->patient))->json('data');
    expect($overview['current']['household_changed'])->toBeTrue()
        ->and($overview['household']['size'])->toBe(2)
        ->and($this->getJson("/api/socioeconomic-profiles/{$id}")->json('data.household_changed'))->toBeTrue();

    // A new dated record snapshots today's household and clears the flag.
    $this->postJson(seStore($this->patient), sePayload())->assertCreated();
    expect($this->getJson(seOverview($this->patient))->json('data.current.household_changed'))->toBeFalse();
});

it('keeps the household snapshot when a record is corrected', function () {
    $id = $this->postJson(seStore($this->patient), sePayload())->assertCreated()->json('data.id');
    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Pedro']);

    $data = $this->putJson("/api/socioeconomic-profiles/{$id}", ['total_family_income' => 9000])
        ->assertOk()->json('data');

    expect($data['household_size'])->toBe(1)
        ->and($data['income']['net_per_capita_income'])->toEqual(4600); // (9000 - 4400) / 1
});

it('replaces expense lines on update only when expenses is sent', function () {
    $id = $this->postJson(seStore($this->patient), sePayload())->assertCreated()->json('data.id');

    $this->putJson("/api/socioeconomic-profiles/{$id}", ['remarks' => 'No expense change'])
        ->assertJsonCount(3, 'data.expenses.lines');

    $replaced = $this->putJson("/api/socioeconomic-profiles/{$id}", [
        'expenses' => [['expense_type' => 'Medicine', 'amount' => 500]],
    ])->assertOk()->json('data');

    expect($replaced['expenses']['lines'])->toHaveCount(1)
        ->and($replaced['expenses']['total'])->toEqual(500)
        ->and($replaced['income']['net_per_capita_income'])->toEqual(11500);

    $this->putJson("/api/socioeconomic-profiles/{$id}", ['expenses' => []])
        ->assertJsonCount(0, 'data.expenses.lines');
});

it('rejects invalid input', function (array $override, string $field) {
    $this->postJson(seStore($this->patient), sePayload($override))
        ->assertUnprocessable()->assertJsonValidationErrors($field);
})->with([
    'unknown tenure' => [['house_tenure' => 'squatting'], 'house_tenure'],
    'unknown light source' => [['light_source' => ['gas']], 'light_source.0'],
    'unknown water source' => [['water_source' => ['river']], 'water_source.0'],
    'negative amount' => [['expenses' => [['expense_type' => 'Food', 'amount' => -1]]], 'expenses.0.amount'],
    'missing expense type' => [['expenses' => [['amount' => 10]]], 'expenses.0.expense_type'],
    'negative income' => [['total_family_income' => -5], 'total_family_income'],
    'future date' => [['recorded_on' => now()->addDay()->toDateString()], 'recorded_on'],
    'missing date' => [['recorded_on' => null], 'recorded_on'],
    'other income without a source' => [['other_income_sources' => [['amount' => 5]]], 'other_income_sources.0.source'],
]);

it('ignores recorded_by and household_size from the body', function () {
    $other = seUser('Supervisor');

    $data = $this->postJson(seStore($this->patient), sePayload(['recorded_by' => $other->id, 'household_size' => 9]))
        ->assertCreated()->json('data');

    expect($data['recorded_by']['id'])->toBe($this->worker->id)->and($data['household_size'])->toBe(1);
});

it('drops a soft-deleted record from the current profile and the history', function () {
    $older = seProfile($this->patient, $this->worker, ['recorded_on' => now()->subDays(5)->toDateString()]);
    $newer = seProfile($this->patient, $this->worker);

    $this->deleteJson("/api/socioeconomic-profiles/{$newer->id}")->assertNoContent();

    $data = $this->getJson(seOverview($this->patient))->json('data');
    expect($data['current']['id'])->toBe($older->id)->and($data['history'])->toHaveCount(1);

    $this->getJson("/api/socioeconomic-profiles/{$newer->id}")->assertNotFound();
    expect(PatientSocioeconomicProfile::withTrashed()->find($newer->id))->not->toBeNull();
});

it('never leaks another patient\'s records', function () {
    $other = Patient::create(['sector_id' => $this->sector->id, 'first_name' => 'Zed', 'last_name' => 'Cruz', 'sex' => 'male']);
    seProfile($other, $this->worker, ['total_family_income' => 99999]);

    $data = $this->getJson(seOverview($this->patient))->assertOk()->json('data');

    expect($data['current'])->toBeNull()->and($data['history'])->toBe([]);
});

it('enforces each socioeconomic permission separately', function () {
    $profile = seProfile($this->patient, $this->worker);

    // Processor: view only.
    Sanctum::actingAs(seUser('Processor'));
    $this->getJson(seOverview($this->patient))->assertOk();
    $this->getJson("/api/socioeconomic-profiles/{$profile->id}")->assertOk();
    $this->postJson(seStore($this->patient), sePayload())->assertForbidden();
    $this->putJson("/api/socioeconomic-profiles/{$profile->id}", ['remarks' => 'x'])->assertForbidden();
    $this->deleteJson("/api/socioeconomic-profiles/{$profile->id}")->assertForbidden();

    // Case Manager: view, create, update — not delete.
    Sanctum::actingAs(seUser('Case Manager'));
    $this->postJson(seStore($this->patient), sePayload())->assertCreated();
    $this->putJson("/api/socioeconomic-profiles/{$profile->id}", ['remarks' => 'ok'])->assertOk();
    $this->deleteJson("/api/socioeconomic-profiles/{$profile->id}")->assertForbidden();

    // MSS Head may delete.
    Sanctum::actingAs($this->worker);
    $this->deleteJson("/api/socioeconomic-profiles/{$profile->id}")->assertNoContent();
});

it('is gated by socioeconomic.view, not by patients.view', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('socioeconomic.view');
    Sanctum::actingAs($user);

    $this->getJson(seOverview($this->patient))->assertOk();

    Sanctum::actingAs(User::factory()->create());
    $this->getJson(seOverview($this->patient))->assertForbidden();
});

it('rejects unauthenticated requests', function () {
    $this->app['auth']->forgetGuards();

    $this->getJson(seOverview($this->patient))->assertUnauthorized();
    $this->postJson(seStore($this->patient), sePayload())->assertUnauthorized();
});

it('returns 404 for an unknown patient or record', function () {
    $this->getJson('/api/patients/999999/socioeconomic')->assertNotFound();
    $this->getJson('/api/socioeconomic-profiles/999999')->assertNotFound();
    $this->postJson('/api/patients/999999/socioeconomic-profiles', sePayload())->assertNotFound();
});

it('does not query once per record', function () {
    foreach (range(1, 6) as $i) {
        seProfile($this->patient, $this->worker, ['recorded_on' => now()->subDays($i)->toDateString()])
            ->expenses()->create(['expense_type' => 'Food', 'amount' => 1]);
    }

    $this->getJson(seOverview($this->patient))->assertOk(); // warm the permission cache

    DB::enableQueryLog();
    $this->getJson(seOverview($this->patient))->assertOk()->assertJsonCount(6, 'data.history');
    $queries = count(DB::getQueryLog());

    foreach (range(7, 12) as $i) {
        seProfile($this->patient, $this->worker, ['recorded_on' => now()->subDays($i)->toDateString()])
            ->expenses()->create(['expense_type' => 'Food', 'amount' => 1]);
    }
    DB::flushQueryLog();
    $this->getJson(seOverview($this->patient))->assertOk();

    expect(count(DB::getQueryLog()))->toBe($queries);
});

it('moves profiles with a patient merge and back on unmerge', function () {
    $source = Patient::create(['sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes ', 'sex' => 'female']);
    $profile = seProfile($source, $this->worker);

    $merge = app(PatientMergeService::class);
    $merge->merge($source, $this->patient, $this->worker);

    expect($profile->refresh()->patient_id)->toBe($this->patient->id);
    $this->getJson(seOverview($this->patient))->assertJsonPath('data.current.id', $profile->id);

    $merge->reverse($merge->latestActiveMergeInto($this->patient), $this->worker);

    expect($profile->refresh()->patient_id)->toBe($source->id);
});

it('audits a profile write against the patient and no case', function () {
    $id = $this->postJson(seStore($this->patient), sePayload())->assertCreated()->json('data.id');

    $rows = Activity::query()->where('subject_type', PatientSocioeconomicProfile::class)
        ->where('subject_id', $id)->get();

    expect($rows)->not->toBeEmpty()
        ->and($rows->pluck('patient_id')->unique()->all())->toBe([$this->patient->id])
        ->and($rows->pluck('case_id')->filter()->all())->toBe([]);
});

it('stays independent of cases, assessments and the UIS', function () {
    // No table of the module points at cases or assessments.
    foreach (['patient_socioeconomic_profiles', 'patient_socioeconomic_expenses'] as $table) {
        expect(Schema::hasColumn($table, 'case_id'))->toBeFalse()
            ->and(Schema::hasColumn($table, 'assessment_id'))->toBeFalse();

        $referenced = collect(Schema::getForeignKeys($table))->pluck('foreign_table')->all();
        expect($referenced)->not->toContain('cases')->not->toContain('assessments')
            ->not->toContain('assessment_expenses');
    }

    // Its source files never reach for them either.
    $files = array_merge(
        [app_path('Models/PatientSocioeconomicProfile.php'), app_path('Models/PatientSocioeconomicExpense.php'),
            app_path('Services/PatientSocioeconomicService.php'), app_path('Services/SocioeconomicProfileService.php'),
            app_path('Support/SocioeconomicVocabulary.php'),
            app_path('Http/Controllers/PatientSocioeconomicController.php'),
            app_path('Http/Controllers/SocioeconomicProfileController.php')],
        glob(app_path('Http/Requests/*SocioeconomicProfileRequest.php')),
    );

    foreach ($files as $file) {
        expect(file_get_contents($file))
            ->not->toContain('Assessment')->not->toContain('CaseModel')
            ->not->toContain('CalculateMswdClassificationAction');
    }
});
