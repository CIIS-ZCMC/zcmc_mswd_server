<?php

use App\Models\Assessment;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->worker = User::factory()->create(['role' => 'Case Manager']);
    $this->worker->assignRole('Case Manager');
    $this->colleague = User::factory()->create(['role' => 'Case Manager']);
    $this->colleague->assignRole('Case Manager');

    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
});

function caseloadPatient(int $sectorId, string $last = 'Reyes'): Patient
{
    return Patient::create([
        'sector_id' => $sectorId, 'first_name' => 'Ana', 'last_name' => $last, 'sex' => 'female',
    ]);
}

function caseloadCase(User $owner, int $sectorId, array $overrides = []): CaseModel
{
    return CaseModel::create(array_merge([
        'patient_id' => caseloadPatient($sectorId)->id,
        'assigned_user_id' => $owner->id,
        'case_code' => 'CASE-'.uniqid(),
        'case_type' => 'medical',
        'priority_level' => 'high',
        'status' => CaseModel::STATUS_OPEN,
        'admission_type' => 'OPD',
        'date_opened' => now(),
    ], $overrides));
}

function withScsr(CaseModel $case, User $author, string $status): CaseModel
{
    Assessment::create([
        'case_id' => $case->id,
        'created_by' => $author->id,
        'classification' => 'indigent',
        'social_case_status' => $status,
        'social_case_no' => 'SCSR-'.uniqid(),
    ]);

    return $case;
}

it('returns only the actor\'s own cases', function () {
    caseloadCase($this->worker, $this->sector->id);
    caseloadCase($this->worker, $this->sector->id);
    caseloadCase($this->colleague, $this->sector->id);

    Sanctum::actingAs($this->worker);
    $response = $this->getJson('/api/my-caseload')->assertOk();

    expect($response->json('data'))->toHaveCount(2);
    foreach ($response->json('data') as $row) {
        expect($row['assigned_user_id'])->toBe($this->worker->id);
    }
});

it('excludes closed cases by default and includes them on request', function () {
    caseloadCase($this->worker, $this->sector->id);
    caseloadCase($this->worker, $this->sector->id, ['status' => CaseModel::STATUS_ONGOING]);
    caseloadCase($this->worker, $this->sector->id, ['status' => CaseModel::STATUS_CLOSED]);

    Sanctum::actingAs($this->worker);

    expect($this->getJson('/api/my-caseload')->assertOk()->json('data'))->toHaveCount(2);
    expect($this->getJson('/api/my-caseload?status=open,ongoing,closed')->assertOk()->json('data'))->toHaveCount(3);
    expect($this->getJson('/api/my-caseload?status=closed')->assertOk()->json('data'))->toHaveCount(1);
});

it('ignores an unrecognised status instead of returning nothing', function () {
    caseloadCase($this->worker, $this->sector->id);

    Sanctum::actingAs($this->worker);
    expect($this->getJson('/api/my-caseload?status=nonsense')->assertOk()->json('data'))->toHaveCount(1);
});

it('filters to the cases that have no social case study', function () {
    $bare = caseloadCase($this->worker, $this->sector->id);
    withScsr(caseloadCase($this->worker, $this->sector->id), $this->worker, Assessment::SOCIAL_CASE_DRAFT);
    withScsr(caseloadCase($this->worker, $this->sector->id), $this->worker, Assessment::SOCIAL_CASE_FINALIZED);

    Sanctum::actingAs($this->worker);
    $response = $this->getJson('/api/my-caseload?social_case_status=none')->assertOk();

    expect($response->json('data'))->toHaveCount(1)
        ->and($response->json('data.0.id'))->toBe($bare->id)
        ->and($response->json('data.0.social_case'))->toBeNull();
});

it('filters to exactly the reports awaiting a signature', function () {
    caseloadCase($this->worker, $this->sector->id);
    $awaiting = withScsr(caseloadCase($this->worker, $this->sector->id), $this->worker, Assessment::SOCIAL_CASE_FOR_REVIEW);
    withScsr(caseloadCase($this->worker, $this->sector->id), $this->worker, Assessment::SOCIAL_CASE_DRAFT);
    withScsr(caseloadCase($this->colleague, $this->sector->id), $this->colleague, Assessment::SOCIAL_CASE_FOR_REVIEW);

    Sanctum::actingAs($this->worker);
    $response = $this->getJson('/api/my-caseload?social_case_status=for_review')->assertOk();

    expect($response->json('data'))->toHaveCount(1)
        ->and($response->json('data.0.id'))->toBe($awaiting->id)
        ->and($response->json('data.0.social_case.social_case_status'))->toBe('for_review');
});

it('reports bucket counts matching the filtered counts', function () {
    caseloadCase($this->worker, $this->sector->id);
    caseloadCase($this->worker, $this->sector->id);
    withScsr(caseloadCase($this->worker, $this->sector->id), $this->worker, Assessment::SOCIAL_CASE_DRAFT);
    withScsr(caseloadCase($this->worker, $this->sector->id), $this->worker, Assessment::SOCIAL_CASE_FOR_REVIEW);
    withScsr(caseloadCase($this->worker, $this->sector->id), $this->worker, Assessment::SOCIAL_CASE_FINALIZED);
    withScsr(caseloadCase($this->worker, $this->sector->id), $this->worker, Assessment::SOCIAL_CASE_FINALIZED);
    // Another worker's cases must not leak into the counts.
    withScsr(caseloadCase($this->colleague, $this->sector->id), $this->colleague, Assessment::SOCIAL_CASE_DRAFT);
    // Nor must a closed case, which the default status filter excludes.
    withScsr(caseloadCase($this->worker, $this->sector->id, ['status' => CaseModel::STATUS_CLOSED]), $this->worker, Assessment::SOCIAL_CASE_DRAFT);

    Sanctum::actingAs($this->worker);
    $buckets = $this->getJson('/api/my-caseload')->assertOk()->json('meta.buckets');

    expect($buckets)->toBe(['none' => 2, 'draft' => 1, 'for_review' => 1, 'finalized' => 2]);

    foreach ($buckets as $bucket => $count) {
        expect($this->getJson("/api/my-caseload?social_case_status={$bucket}")->assertOk()->json('data'))
            ->toHaveCount($count);
    }
});

it('keeps bucket counts stable when a bucket is selected', function () {
    caseloadCase($this->worker, $this->sector->id);
    withScsr(caseloadCase($this->worker, $this->sector->id), $this->worker, Assessment::SOCIAL_CASE_DRAFT);

    Sanctum::actingAs($this->worker);

    // A tab count that changed when you clicked the tab would be useless.
    expect($this->getJson('/api/my-caseload?social_case_status=draft')->assertOk()->json('meta.buckets'))
        ->toBe(['none' => 1, 'draft' => 1, 'for_review' => 0, 'finalized' => 0]);
});

it('searches and sorts within the caseload', function () {
    $target = caseloadCase($this->worker, $this->sector->id, ['case_code' => 'CASE-FINDME']);
    caseloadCase($this->worker, $this->sector->id, ['case_code' => 'CASE-OTHER']);

    Sanctum::actingAs($this->worker);

    $found = $this->getJson('/api/my-caseload?search=FINDME')->assertOk();
    expect($found->json('data'))->toHaveCount(1)
        ->and($found->json('data.0.id'))->toBe($target->id);

    $sorted = $this->getJson('/api/my-caseload?sort=case_code&direction=asc')->assertOk();
    expect($sorted->json('data.0.case_code'))->toBe('CASE-FINDME');
});

it('paginates', function () {
    foreach (range(1, 5) as $i) {
        caseloadCase($this->worker, $this->sector->id);
    }

    Sanctum::actingAs($this->worker);
    $response = $this->getJson('/api/my-caseload?per_page=2')->assertOk();

    expect($response->json('data'))->toHaveCount(2)
        ->and($response->json('meta.total'))->toBe(5);
});

it('requires cases.view', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->getJson('/api/my-caseload')->assertForbidden();
});

it('issues a constant number of queries regardless of row count', function () {
    Sanctum::actingAs($this->worker);

    caseloadCase($this->worker, $this->sector->id);
    caseloadCase($this->worker, $this->sector->id);
    withScsr(caseloadCase($this->worker, $this->sector->id), $this->worker, Assessment::SOCIAL_CASE_DRAFT);

    // Warm-up: Spatie caches the permission lookup on first use, so the first
    // request in a process issues queries later ones do not.
    $this->getJson('/api/my-caseload')->assertOk();

    $countQueries = function () {
        DB::enableQueryLog();
        DB::flushQueryLog();
        $this->getJson('/api/my-caseload')->assertOk();
        $count = count(DB::getQueryLog());
        DB::disableQueryLog();

        return $count;
    };

    $withThree = $countQueries();

    foreach (range(1, 3) as $i) {
        withScsr(caseloadCase($this->worker, $this->sector->id), $this->worker, Assessment::SOCIAL_CASE_FOR_REVIEW);
    }

    expect($countQueries())->toBe($withThree);
});
