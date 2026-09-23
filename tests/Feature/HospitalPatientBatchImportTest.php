<?php

use App\Enums\HospitalPatientImportStatus;
use App\Models\Bizbox\HospitalPatient;
use App\Models\Bizbox\PatientPersonalData;
use App\Models\HospitalPatientImportBatch;
use App\Models\HospitalPatientImportResult;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use App\Repositories\Contracts\HospitalPatientRepositoryInterface;
use App\Services\HospitalPatientImportService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

function batchUser(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

/** A HIS patient fixture with personal data attached (no sqlsrv). */
function hisBulkPatient(int $key, ?int $patid): HospitalPatient
{
    $personal = (new PatientPersonalData)->forceFill([
        'firstname' => "First{$key}",
        'lastname' => "Last{$key}",
        'gender' => 'Male',
        'birthdate' => '1980-01-01 00:00:00',
        'civilstatus' => 'S',
    ]);

    $hp = (new HospitalPatient)->forceFill(['PK_emdPatients' => $key, 'patid' => $patid]);
    $hp->setRelation('personalData', $personal);

    return $hp;
}

/** Mock the HIS repo to return the given fixtures for findManyByKeys. */
function mockHisRepo(array $fixtures): void
{
    test()->mock(HospitalPatientRepositoryInterface::class, function ($mock) use ($fixtures) {
        $mock->shouldReceive('findManyByKeys')
            ->andReturn(new EloquentCollection($fixtures));
    });
}

it('imports a batch with per-row outcomes: created, updated, skipped', function () {
    // id 2 already exists locally → update; id 3 has no hospital number → skip.
    Patient::create(['hospital_id' => 778, 'first_name' => 'Old', 'last_name' => 'Name']);

    mockHisRepo([
        hisBulkPatient(1, 777),
        hisBulkPatient(2, 778),
        hisBulkPatient(3, null),
    ]);

    $batch = app(HospitalPatientImportService::class)->importByIds([1, 2, 3]);
    $batch->refresh();

    expect($batch->status)->toBe(HospitalPatientImportStatus::Completed)
        ->and($batch->total)->toBe(3)
        ->and($batch->created_count)->toBe(1)
        ->and($batch->updated_count)->toBe(1)
        ->and($batch->skipped_count)->toBe(1)
        ->and($batch->failed_count)->toBe(0)
        ->and($batch->results()->count())->toBe(3)
        ->and(Patient::count())->toBe(2); // 778 existed + 777 created; skipped makes none
});

it('is idempotent: re-importing the same id updates, no duplicate', function () {
    mockHisRepo([hisBulkPatient(1, 777)]);

    $service = app(HospitalPatientImportService::class);

    $first = $service->importByIds([1])->refresh();
    $second = $service->importByIds([1])->refresh();

    expect($first->created_count)->toBe(1)
        ->and($second->updated_count)->toBe(1)
        ->and($second->created_count)->toBe(0)
        ->and(Patient::where('hospital_id', 777)->count())->toBe(1);
});

it('records a failed outcome for an id the HIS does not return', function () {
    mockHisRepo([hisBulkPatient(1, 777)]); // id 2 is absent from the result set

    $batch = app(HospitalPatientImportService::class)->importByIds([1, 2])->refresh();

    expect($batch->status)->toBe(HospitalPatientImportStatus::CompletedWithErrors)
        ->and($batch->created_count)->toBe(1)
        ->and($batch->failed_count)->toBe(1);

    $failed = HospitalPatientImportResult::where('batch_id', $batch->id)
        ->where('hospital_patient_id', 2)->first();

    expect($failed->outcome->value)->toBe('failed')
        ->and($failed->message)->toContain('hospital system');
});

it('marks every row failed when the HIS is unreachable', function () {
    $this->mock(HospitalPatientRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('findManyByKeys')
            ->andThrow(new QueryException('sqlsrv', 'select 1', [], new RuntimeException('unreachable')));
    });

    $batch = app(HospitalPatientImportService::class)->importByIds([1, 2, 3])->refresh();

    expect($batch->status)->toBe(HospitalPatientImportStatus::Failed)
        ->and($batch->failed_count)->toBe(3)
        ->and(Patient::count())->toBe(0);
});

it('processes ids across multiple chunks', function () {
    // findManyByKeys is called once per chunk (size 50); return a fixture per id.
    $this->mock(HospitalPatientRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('findManyByKeys')
            ->twice()
            ->andReturnUsing(fn (array $ids) => new EloquentCollection(
                array_map(fn ($id) => hisBulkPatient($id, 1000 + $id), $ids),
            ));
    });

    $batch = app(HospitalPatientImportService::class)->importByIds(range(1, 55))->refresh();

    expect($batch->total)->toBe(55)
        ->and($batch->created_count)->toBe(55)
        ->and($batch->results()->count())->toBe(55)
        ->and(Patient::count())->toBe(55);
});

it('queues a batch through the API and reports it', function () {
    Sanctum::actingAs(batchUser());
    mockHisRepo([hisBulkPatient(1, 777), hisBulkPatient(2, 778)]);

    $response = $this->postJson('/api/hospital-patients/import-batch', ['ids' => [1, 2]])
        ->assertAccepted()
        ->assertJsonPath('data.total', 2)
        ->assertJsonPath('data.created_count', 2);

    $batchId = $response->json('data.id');

    $this->getJson("/api/hospital-patients/import-batches/{$batchId}")
        ->assertOk()
        ->assertJsonPath('data.status.code', 'completed')
        ->assertJsonCount(2, 'data.results');
});

it('validates the ids payload', function () {
    Sanctum::actingAs(batchUser());

    $this->postJson('/api/hospital-patients/import-batch', ['ids' => []])
        ->assertJsonValidationErrors('ids');
});

it('refuses the batch import without patients.create', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'Social Worker'])); // no permissions

    $this->postJson('/api/hospital-patients/import-batch', ['ids' => [1]])
        ->assertForbidden();
});
