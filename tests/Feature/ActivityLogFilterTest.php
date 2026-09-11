<?php

use App\Models\Activity;
use App\Models\CaseModel;
use App\Models\Document;
use App\Models\Patient;
use App\Models\PatientCaretaker;
use App\Models\PatientFamilyMember;
use App\Models\PatientId;
use App\Models\PatientWatcher;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->worker = User::factory()->create();
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
    $this->auditor = User::factory()->create(['role' => 'MSS Head']);
    $this->auditor->assignRole('MSS Head');
});

it('filters the log by causer', function () {
    Sanctum::actingAs($this->auditor);

    // Acting as the auditor, so these rows are attributed to them.
    $this->putJson("/api/patients/{$this->patient->id}", ['first_name' => 'Anna'])->assertOk();

    $response = $this->getJson("/api/activity-log?user_id={$this->auditor->id}")->assertOk();

    expect($response->json('data'))->not->toBeEmpty();

    $other = $this->getJson('/api/activity-log?user_id='.User::factory()->create()->id)->assertOk();

    expect($other->json('data'))->toBeEmpty();
});

it('filters the log by date range', function () {
    Sanctum::actingAs($this->auditor);
    PatientWatcher::create(['patient_id' => $this->patient->id, 'name' => 'Maria', 'relationship' => 'spouse']);

    // Backdate the row so a bounded range can exclude it.
    Activity::query()->update(['created_at' => now()->subDays(10)]);

    $inRange = $this->getJson('/api/activity-log?date_from='.now()->subDays(11)->toDateString()
        .'&date_to='.now()->subDays(9)->toDateString())->assertOk();

    $outOfRange = $this->getJson('/api/activity-log?date_from='.now()->subDay()->toDateString())->assertOk();

    expect($inRange->json('data'))->not->toBeEmpty()
        ->and($outOfRange->json('data'))->toBeEmpty();
});

it('filters the log by log name', function () {
    Sanctum::actingAs($this->auditor);
    PatientWatcher::create(['patient_id' => $this->patient->id, 'name' => 'Maria', 'relationship' => 'spouse']);

    $matching = $this->getJson('/api/activity-log?log_name=patient_watcher')->assertOk();
    $nonMatching = $this->getJson('/api/activity-log?log_name=nothing_logs_under_this')->assertOk();

    expect($matching->json('data'))->not->toBeEmpty()
        ->and($nonMatching->json('data'))->toBeEmpty();
});

it('ignores an unrecognised event rather than erroring', function () {
    Sanctum::actingAs($this->auditor);
    PatientWatcher::create(['patient_id' => $this->patient->id, 'name' => 'Maria', 'relationship' => 'spouse']);

    // An unknown event is dropped from the filter, not treated as a match on
    // nothing and not a 500.
    $this->getJson('/api/activity-log?event=teleported')->assertOk();
});

it('keeps hiding a protective case that has since been soft-deleted', function () {
    $supervisor = User::factory()->create(['role' => 'Supervisor']);
    $supervisor->assignRole('Supervisor');
    Sanctum::actingAs($supervisor);

    $protective = CaseModel::create([
        'patient_id' => $this->patient->id, 'case_code' => 'CASE-P', 'case_type' => 'medical',
        'priority_level' => 'high', 'admission_type' => 'ER', 'status' => CaseModel::STATUS_OPEN,
        'assigned_user_id' => $this->worker->id, 'date_opened' => now(), 'is_protective' => true,
    ]);
    $protective->delete();

    $caseIds = collect($this->getJson('/api/activity-log')->assertOk()->json('data'))
        ->pluck('case_id')->filter()->unique();

    expect($caseIds)->not->toContain($protective->id);
});

it('matches the trail the old subject fan-out would have produced', function () {
    // The six subject types PatientService::history() named before Phase 2
    // replaced the fan-out with an indexed read on patient_id.
    $case = CaseModel::create([
        'patient_id' => $this->patient->id, 'case_code' => 'CASE-1', 'case_type' => 'medical',
        'priority_level' => 'high', 'admission_type' => 'ER', 'status' => CaseModel::STATUS_OPEN,
        'assigned_user_id' => $this->worker->id, 'date_opened' => now(),
    ]);
    PatientId::create(['patient_id' => $this->patient->id, 'id_type' => 'philhealth', 'id_number' => '1']);
    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Maria']);
    PatientWatcher::create(['patient_id' => $this->patient->id, 'name' => 'Jo', 'relationship' => 'spouse']);
    PatientCaretaker::create([
        'patient_id' => $this->patient->id, 'user_id' => $this->worker->id,
        'role' => 'social_worker', 'assigned_date' => now(),
    ]);
    Document::create([
        'patient_id' => $this->patient->id, 'case_id' => $case->id, 'uploaded_by' => $this->worker->id,
        'document_type' => 'consent', 'file_name' => 'c.pdf', 'file_path' => 'd/c.pdf', 'file_type' => 'pdf',
    ]);

    $fanOutSubjects = [
        Patient::class => [$this->patient->id],
        PatientId::class => $this->patient->patientIds()->pluck('id')->all(),
        PatientFamilyMember::class => $this->patient->familyMembers()->pluck('id')->all(),
        PatientWatcher::class => $this->patient->watchers()->pluck('id')->all(),
        PatientCaretaker::class => $this->patient->caretakers()->pluck('id')->all(),
        Document::class => $this->patient->documents()->pluck('id')->all(),
    ];

    $fanOutIds = Activity::query()
        ->where(function ($query) use ($fanOutSubjects) {
            foreach ($fanOutSubjects as $type => $ids) {
                if ($ids === []) {
                    continue;
                }
                $query->orWhere(fn ($sub) => $sub
                    ->where('subject_type', (new $type)->getMorphClass())
                    ->whereIn('subject_id', $ids));
            }
        })
        ->pluck('id')
        ->sort()
        ->values();

    $stampedIds = Activity::forPatient($this->patient->id)->pluck('id')->sort()->values();

    // Every row the old query found is still found. The new read is a superset:
    // it also reaches the case and the episode-level records, which the fan-out
    // could not name.
    expect($stampedIds->intersect($fanOutIds)->values()->all())->toBe($fanOutIds->all())
        ->and($stampedIds->count())->toBeGreaterThan($fanOutIds->count());
});

it('backfills to exactly what live stamping produces', function () {
    PatientWatcher::create(['patient_id' => $this->patient->id, 'name' => 'Maria', 'relationship' => 'spouse']);
    PatientId::create(['patient_id' => $this->patient->id, 'id_type' => 'philhealth', 'id_number' => '1']);

    $live = Activity::query()->orderBy('id')->get(['id', 'patient_id', 'case_id'])->toArray();

    DB::table('activity_log')->update(['patient_id' => null, 'case_id' => null]);
    (require database_path('migrations/2026_09_11_100001_backfill_activity_log_ownership.php'))->up();

    $backfilled = Activity::query()->orderBy('id')->get(['id', 'patient_id', 'case_id'])->toArray();

    expect($backfilled)->toEqual($live);
});
