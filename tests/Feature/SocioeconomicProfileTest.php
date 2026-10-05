<?php

use App\Models\Patient;
use App\Models\PatientFamilyMember;
use App\Models\PatientSocioeconomicProfile;
use App\Models\Sector;
use App\Models\User;
use App\Services\PatientMergeService;
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
        'house_tenure' => 'owned', 'food' => 1000,
    ], $overrides));
}

function sePayload(array $overrides = []): array
{
    return array_merge([
        'recorded_on' => now()->toDateString(),
        'house_tenure' => 'rented', 'house_rent_amount' => 3500,
        'light_source' => ['electricity'], 'water_source' => ['public'],
        'food' => 3000, 'transport' => 600, 'medical' => 800, 'insurance' => 200,
        'education' => 1000, 'clothing' => 300, 'house_help' => 400,
        'others' => 500, 'others_specify' => 'Pets',
        'remarks' => 'Stable',
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

it('records a List of Expenses with the rent, sources, amounts and total', function () {
    $data = $this->postJson(seStore($this->patient), sePayload())->assertCreated()->json('data');

    expect($data['recorded_by']['id'])->toBe($this->worker->id)
        ->and($data['house'])->toEqual(['tenure' => 'rented', 'rent_amount' => 3500])
        ->and($data['light_source'])->toBe(['electricity'])
        ->and($data['water_source'])->toBe(['public'])
        ->and($data['expenses'])->toEqual([
            'food' => 3000, 'transport' => 600, 'medical' => 800, 'insurance' => 200,
            'education' => 1000, 'clothing' => 300, 'house_help' => 400, 'others' => 500, 'others_specify' => 'Pets',
        ])
        ->and($data['total'])->toEqual(10300) // 3500 rent + 6800 items
        ->and($data['remarks'])->toBe('Stable');
});

it('keeps the rent amount only when the house is rented', function () {
    $owned = $this->postJson(seStore($this->patient), sePayload(['house_tenure' => 'owned']))->assertCreated()->json('data');

    expect($owned['house']['rent_amount'])->toBeNull()
        ->and($owned['total'])->toEqual(6800); // the rent is not counted

    $none = $this->postJson(seStore($this->patient), sePayload(['house_tenure' => null]))->assertCreated()->json('data');
    expect($none['house']['rent_amount'])->toBeNull()->and($none['total'])->toEqual(6800);

    $id = $this->postJson(seStore($this->patient), sePayload())->assertCreated()->json('data.id');

    // Rented -> owned clears the stored amount; owned -> rented needs it sent again.
    $flipped = $this->putJson("/api/socioeconomic-profiles/{$id}", ['house_tenure' => 'owned'])->assertOk()->json('data');
    expect($flipped['house']['rent_amount'])->toBeNull()
        ->and(PatientSocioeconomicProfile::find($id)->house_rent_amount)->toBeNull();

    $back = $this->putJson("/api/socioeconomic-profiles/{$id}", ['house_tenure' => 'rented', 'house_rent_amount' => 4000])
        ->assertOk()->json('data');
    expect($back['house']['rent_amount'])->toEqual(4000)->and($back['total'])->toEqual(10800);
});

it('does not touch the rent when an update leaves the tenure alone', function () {
    $id = $this->postJson(seStore($this->patient), sePayload())->assertCreated()->json('data.id');

    $data = $this->putJson("/api/socioeconomic-profiles/{$id}", ['food' => 100])->assertOk()->json('data');

    expect($data['house']['rent_amount'])->toEqual(3500)->and($data['total'])->toEqual(7400); // 3500 + 3900
});

it('counts blank amounts as zero', function () {
    $data = $this->postJson(seStore($this->patient), [
        'recorded_on' => now()->toDateString(), 'food' => 250,
    ])->assertCreated()->json('data');

    expect($data['total'])->toEqual(250)
        ->and($data['expenses']['transport'])->toBeNull()
        ->and($data['expenses']['others_specify'])->toBeNull()
        ->and($data['light_source'])->toBe([])
        ->and($data['house'])->toBe(['tenure' => null, 'rent_amount' => null]);

    $this->postJson(seStore($this->patient), ['recorded_on' => now()->toDateString()])
        ->assertCreated()->assertJsonPath('data.total', 0);
});

it('takes the newest dated record as current and lists the history newest first, capped', function () {
    foreach (range(1, 12) as $i) {
        seProfile($this->patient, $this->worker, [
            'recorded_on' => now()->subDays(20 - $i)->toDateString(), 'food' => 100 * $i,
        ]);
    }

    $data = $this->getJson(seOverview($this->patient))->assertOk()->json('data');

    expect($data['history'])->toHaveCount(10)
        ->and($data['history'][0]['total'])->toEqual(1200)
        ->and($data['history'][0]['house_tenure'])->toBe('owned')
        ->and($data['history'][9]['total'])->toEqual(300)
        ->and($data['current']['total'])->toEqual(1200);
});

it('breaks a same-day tie by the newest id', function () {
    $first = seProfile($this->patient, $this->worker);
    $second = seProfile($this->patient, $this->worker);

    $this->getJson(seOverview($this->patient))->assertJsonPath('data.current.id', $second->id)
        ->assertJsonPath('data.history.1.id', $first->id);
});

it('carries family income but no household size, per-capita or classification', function () {
    $id = $this->postJson(seStore($this->patient), sePayload())->assertCreated()->json('data.id');

    $overview = $this->getJson(seOverview($this->patient))->assertOk()->json('data');

    expect(array_keys($overview))->toBe(['current', 'live_income', 'history'])
        ->and($overview['current'])->toHaveKey('income')
        ->and($overview['current'])->not->toHaveKeys(['household_size', 'classification', 'net_per_capita_income'])
        ->and($overview['current']['income'])->not->toHaveKeys(['net_per_capita_income', 'household_size'])
        ->and($this->getJson("/api/socioeconomic-profiles/{$id}")->json('data'))->toHaveKey('income');
});

/** A patient with a monthly income and three family members, two of whom earn. */
function seFamily(Patient $patient): array
{
    $patient->update(['monthly_income' => 3000]);

    return [
        PatientFamilyMember::create(['patient_id' => $patient->id, 'name' => 'Pedro', 'relationship' => 'Spouse', 'monthly_income' => 5000]),
        PatientFamilyMember::create(['patient_id' => $patient->id, 'name' => 'Lita', 'relationship' => 'Daughter']), // no income
        PatientFamilyMember::create(['patient_id' => $patient->id, 'name' => 'Juan', 'relationship' => 'Son',
            'monthly_income' => 2000, 'is_living_with_patient' => false]),
    ];
}

it('totals the family income from the patient, every family member and the other sources', function () {
    seFamily($this->patient);

    $data = $this->postJson(seStore($this->patient), sePayload([
        'other_income_sources' => [['source' => 'Remittance', 'amount' => 1500], ['source' => 'Pension', 'amount' => 500]],
    ]))->assertCreated()->json('data');

    expect($data['income']['patient_income'])->toEqual(3000)
        ->and($data['income']['family_members'])->toEqual([
            ['name' => 'Pedro', 'relationship' => 'Spouse', 'monthly_income' => 5000],
            ['name' => 'Juan', 'relationship' => 'Son', 'monthly_income' => 2000], // not living with the patient, still counts
        ])
        ->and($data['income']['family_members_total'])->toEqual(7000)
        ->and($data['income']['other_sources'])->toEqual([
            ['source' => 'Remittance', 'amount' => 1500], ['source' => 'Pension', 'amount' => 500],
        ])
        ->and($data['income']['other_sources_total'])->toEqual(2000)
        ->and($data['income']['total_family_income'])->toEqual(12000)
        ->and($data['total'])->toEqual(10300)
        ->and($data['income']['balance'])->toEqual(1700)
        ->and($data['income']['expense_to_income_ratio'])->toEqual(0.86)
        ->and($data['income']['income_changed'])->toBeFalse();
});

it('has a zero total and no ratio for a patient with no income and no family', function () {
    $data = $this->postJson(seStore($this->patient), sePayload())->assertCreated()->json('data');

    expect($data['income']['patient_income'])->toBeNull()
        ->and($data['income']['family_members'])->toBe([])
        ->and($data['income']['total_family_income'])->toEqual(0)
        ->and($data['income']['balance'])->toEqual(-10300)
        ->and($data['income']['expense_to_income_ratio'])->toBeNull();
});

it('returns the live family income for the form to pre-fill', function () {
    [$pedro] = seFamily($this->patient);

    $live = $this->getJson(seOverview($this->patient))->assertOk()->json('data.live_income');

    expect($live['patient_income'])->toEqual(3000)
        ->and($live['family_members'])->toHaveCount(2)
        ->and($live['family_members'][0])->toMatchArray(['id' => $pedro->id, 'name' => 'Pedro'])
        ->and($live['family_members_total'])->toEqual(7000)
        ->and($live['total'])->toEqual(10000);
});

it('never takes the income snapshot or the total from the body', function () {
    seFamily($this->patient);

    $data = $this->postJson(seStore($this->patient), sePayload([
        'total_family_income' => 999999, 'patient_income' => 1, 'income_members' => [['name' => 'X', 'monthly_income' => 1]],
    ]))->assertCreated()->json('data');

    expect($data['income']['total_family_income'])->toEqual(10000)
        ->and($data['income']['patient_income'])->toEqual(3000)
        ->and($data['income']['family_members'])->toHaveCount(2);
});

it('rejects invalid other family income', function (array $sources, string $field) {
    $this->postJson(seStore($this->patient), sePayload(['other_income_sources' => $sources]))
        ->assertUnprocessable()->assertJsonValidationErrors($field);
})->with([
    'blank source' => [[['source' => '', 'amount' => 10]], 'other_income_sources.0.source'],
    'missing source' => [[['amount' => 10]], 'other_income_sources.0.source'],
    'missing amount' => [[['source' => 'Pension']], 'other_income_sources.0.amount'],
    'negative amount' => [[['source' => 'Pension', 'amount' => -5]], 'other_income_sources.0.amount'],
    'over-long source' => [[['source' => str_repeat('x', 256), 'amount' => 5]], 'other_income_sources.0.source'],
]);

it('keeps the snapshot on update and recomputes the total when other income changes', function () {
    [$pedro] = seFamily($this->patient);
    $id = $this->postJson(seStore($this->patient), sePayload())->assertCreated()->json('data.id'); // 10000

    $pedro->update(['monthly_income' => 9000]); // the family changes afterwards

    $kept = $this->putJson("/api/socioeconomic-profiles/{$id}", ['remarks' => 'Same snapshot'])->assertOk()->json('data');
    expect($kept['income']['total_family_income'])->toEqual(10000)
        ->and($kept['income']['income_changed'])->toBeTrue();

    $recomputed = $this->putJson("/api/socioeconomic-profiles/{$id}", [
        'other_income_sources' => [['source' => 'Remittance', 'amount' => 1000]],
    ])->assertOk()->json('data');
    expect($recomputed['income']['total_family_income'])->toEqual(11000) // the old snapshot + 1000
        ->and($recomputed['income']['family_members'][0]['monthly_income'])->toEqual(5000);
});

it('re-reads the live family on refresh_income', function () {
    [$pedro] = seFamily($this->patient);
    $id = $this->postJson(seStore($this->patient), sePayload())->assertCreated()->json('data.id');

    $pedro->update(['monthly_income' => 9000]);

    $data = $this->putJson("/api/socioeconomic-profiles/{$id}", ['refresh_income' => true])->assertOk()->json('data');

    expect($data['income']['family_members'][0]['monthly_income'])->toEqual(9000)
        ->and($data['income']['total_family_income'])->toEqual(14000) // 3000 + 9000 + 2000
        ->and($data['income']['income_changed'])->toBeFalse();
});

it('flags income_changed when a family income changes and clears it on a new record', function () {
    [$pedro] = seFamily($this->patient);
    $this->postJson(seStore($this->patient), sePayload())->assertCreated();

    expect($this->getJson(seOverview($this->patient))->json('data.current.income.income_changed'))->toBeFalse();

    $pedro->update(['monthly_income' => 6000]);
    expect($this->getJson(seOverview($this->patient))->json('data.current.income.income_changed'))->toBeTrue();

    $this->patient->update(['monthly_income' => 3500]);
    $this->postJson(seStore($this->patient), sePayload())->assertCreated();
    expect($this->getJson(seOverview($this->patient))->json('data.current.income.income_changed'))->toBeFalse();
});

it('flags income_changed when a member with income is added or removed', function () {
    $this->postJson(seStore($this->patient), sePayload())->assertCreated();

    $member = PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Pedro', 'monthly_income' => 4000]);
    expect($this->getJson(seOverview($this->patient))->json('data.current.income.income_changed'))->toBeTrue();

    // A member without income does not change the family income.
    $member->delete();
    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Lita']);
    expect($this->getJson(seOverview($this->patient))->json('data.current.income.income_changed'))->toBeFalse();
});

it('puts the family income and the balance on every history row', function () {
    seFamily($this->patient);
    $this->postJson(seStore($this->patient), sePayload(['recorded_on' => now()->subDays(3)->toDateString()]))->assertCreated();
    $this->postJson(seStore($this->patient), sePayload(['food' => 0]))->assertCreated();

    $history = $this->getJson(seOverview($this->patient))->json('data.history');

    expect($history)->toHaveCount(2)
        ->and($history[0]['total_family_income'])->toEqual(10000)
        ->and($history[0]['total'])->toEqual(7300)
        ->and($history[0]['balance'])->toEqual(2700)
        ->and($history[1]['balance'])->toEqual(-300); // 10000 - 10300
});

it('leaves a record from before the income columns alone', function () {
    $legacy = seProfile($this->patient, $this->worker); // no snapshot, no total

    $data = $this->getJson("/api/socioeconomic-profiles/{$legacy->id}")->assertOk()->json('data');
    expect($data['income']['total_family_income'])->toBeNull()
        ->and($data['income']['balance'])->toBeNull()
        ->and($data['income']['income_changed'])->toBeFalse();

    seFamily($this->patient);

    $after = $this->putJson("/api/socioeconomic-profiles/{$legacy->id}", ['remarks' => 'Touched'])->assertOk()->json('data');
    expect($after['income']['total_family_income'])->toBeNull()
        ->and($after['income']['income_changed'])->toBeFalse();
});

it('rejects invalid input', function (array $override, string $field) {
    $this->postJson(seStore($this->patient), sePayload($override))
        ->assertUnprocessable()->assertJsonValidationErrors($field);
})->with([
    'unknown tenure' => [['house_tenure' => 'squatting'], 'house_tenure'],
    'unknown light source' => [['light_source' => ['gas']], 'light_source.0'],
    'unknown water source' => [['water_source' => ['river']], 'water_source.0'],
    'negative rent' => [['house_rent_amount' => -1], 'house_rent_amount'],
    'negative amount' => [['food' => -1], 'food'],
    'non-numeric amount' => [['medical' => 'lots'], 'medical'],
    'over-long specify' => [['others_specify' => str_repeat('x', 256)], 'others_specify'],
    'future date' => [['recorded_on' => now()->addDay()->toDateString()], 'recorded_on'],
    'missing date' => [['recorded_on' => null], 'recorded_on'],
]);

it('ignores recorded_by from the body', function () {
    $other = seUser('Supervisor');

    $data = $this->postJson(seStore($this->patient), sePayload(['recorded_by' => $other->id]))
        ->assertCreated()->json('data');

    expect($data['recorded_by']['id'])->toBe($this->worker->id);
});

// The users table names a person `employee_name`. SQLite quietly reads an unknown quoted column as a
// string literal, so a wrong column here only fails on MySQL — assert the name itself.
it('names the author of a record by their employee_name everywhere it is returned', function () {
    $author = ['id' => $this->worker->id, 'name' => $this->worker->employee_name];

    $created = $this->postJson(seStore($this->patient), sePayload())->assertCreated()->json('data');
    expect($created['recorded_by'])->toBe($author);

    $id = $created['id'];
    expect($this->getJson("/api/socioeconomic-profiles/{$id}")->json('data.recorded_by'))->toBe($author)
        ->and($this->putJson("/api/socioeconomic-profiles/{$id}", ['remarks' => 'x'])->json('data.recorded_by'))->toBe($author)
        ->and($this->getJson(seOverview($this->patient))->json('data.current.recorded_by'))->toBe($author);
});

it('drops a soft-deleted record from the current record and the history', function () {
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
    seProfile($other, $this->worker, ['food' => 99999]);

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
        seProfile($this->patient, $this->worker, ['recorded_on' => now()->subDays($i)->toDateString()]);
    }

    $this->getJson(seOverview($this->patient))->assertOk(); // warm the permission cache

    DB::enableQueryLog();
    $this->getJson(seOverview($this->patient))->assertOk()->assertJsonCount(6, 'data.history');
    $queries = count(DB::getQueryLog());

    foreach (range(7, 12) as $i) {
        seProfile($this->patient, $this->worker, ['recorded_on' => now()->subDays($i)->toDateString()]);
    }
    DB::flushQueryLog();
    $this->getJson(seOverview($this->patient))->assertOk();

    expect(count(DB::getQueryLog()))->toBe($queries);
});

it('moves records with a patient merge and back on unmerge', function () {
    $source = Patient::create(['sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes ', 'sex' => 'female']);
    $profile = seProfile($source, $this->worker);

    $merge = app(PatientMergeService::class);
    $merge->merge($source, $this->patient, $this->worker);

    expect($profile->refresh()->patient_id)->toBe($this->patient->id);
    $this->getJson(seOverview($this->patient))->assertJsonPath('data.current.id', $profile->id);

    $merge->reverse($merge->latestActiveMergeInto($this->patient), $this->worker);

    expect($profile->refresh()->patient_id)->toBe($source->id);
});

it('audits a write against the patient and no case', function () {
    $id = $this->postJson(seStore($this->patient), sePayload())->assertCreated()->json('data.id');

    $rows = Activity::query()->where('subject_type', PatientSocioeconomicProfile::class)
        ->where('subject_id', $id)->get();

    expect($rows)->not->toBeEmpty()
        ->and($rows->pluck('patient_id')->unique()->all())->toBe([$this->patient->id])
        ->and($rows->pluck('case_id')->filter()->all())->toBe([]);
});

it('stays independent of cases, assessments and the UIS', function () {
    // The table does not point at cases or assessments.
    expect(Schema::hasColumn('patient_socioeconomic_profiles', 'case_id'))->toBeFalse()
        ->and(Schema::hasColumn('patient_socioeconomic_profiles', 'assessment_id'))->toBeFalse();

    $referenced = collect(Schema::getForeignKeys('patient_socioeconomic_profiles'))->pluck('foreign_table')->all();
    expect($referenced)->not->toContain('cases')->not->toContain('assessments');

    // The List of Expenses rework removed the free-text lines, the household and the per-capita figures
    // (the family income columns came back with the family-income phase).
    expect(Schema::hasTable('patient_socioeconomic_expenses'))->toBeFalse();
    foreach (['housing_type', 'utilities_access', 'household_size', 'net_per_capita_income'] as $gone) {
        expect(Schema::hasColumn('patient_socioeconomic_profiles', $gone))->toBeFalse();
    }

    // Its source files never reach for them either.
    $files = array_merge(
        [app_path('Models/PatientSocioeconomicProfile.php'),
            app_path('Services/PatientSocioeconomicService.php'), app_path('Services/SocioeconomicProfileService.php'),
            app_path('Support/SocioeconomicVocabulary.php'), app_path('Support/FamilyIncome.php'),
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
