<?php

use App\Models\CaseModel;
use App\Models\CaseWatcher;
use App\Models\Patient;
use App\Models\PatientWatcher;
use App\Models\Sector;
use App\Models\User;
use App\Models\WatcherRelationshipType;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\WatcherRelationshipTypeSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->user = User::factory()->create();
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
    $this->case = CaseModel::create([
        'patient_id' => $this->patient->id, 'assigned_user_id' => $this->user->id,
        'case_code' => 'CASE-'.uniqid(), 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'ER', 'date_opened' => now(),
    ]);
});

function makeCaseWatcher(CaseModel $case, array $overrides = []): CaseWatcher
{
    return CaseWatcher::create(array_merge([
        'case_id' => $case->id,
        'name' => 'Maria Reyes',
        'relationship' => 'spouse',
        'is_primary' => true,
        'added_by' => test()->user->id,
    ], $overrides));
}

it('creates a case watcher with the expected attributes and casts', function () {
    $watcher = makeCaseWatcher($this->case, [
        'is_informant' => true,
        'pass_number' => 'PASS-0001',
        'pass_valid_until' => '2026-12-31',
        'present_from' => '2026-09-08 08:00:00',
    ])->refresh();

    expect($watcher->is_primary)->toBeTrue()
        ->and($watcher->is_informant)->toBeTrue()
        ->and($watcher->pass_status)->toBe('active') // DB default
        ->and($watcher->pass_valid_until)->toBeInstanceOf(Illuminate\Support\Carbon::class)
        ->and($watcher->present_from)->toBeInstanceOf(Illuminate\Support\Carbon::class);
});

it('resolves case, patientWatcher and addedBy relations', function () {
    $directoryEntry = PatientWatcher::create([
        'patient_id' => $this->patient->id, 'name' => 'Maria Reyes', 'relationship' => 'spouse',
    ]);
    $watcher = makeCaseWatcher($this->case, ['patient_watcher_id' => $directoryEntry->id]);

    expect($watcher->case->is($this->case))->toBeTrue()
        ->and($watcher->patientWatcher->is($directoryEntry))->toBeTrue()
        ->and($watcher->addedBy->is($this->user))->toBeTrue()
        ->and($directoryEntry->caseWatchers()->first()->is($watcher))->toBeTrue();
});

it('exposes watchers through CaseModel::watchers()', function () {
    makeCaseWatcher($this->case);

    expect($this->case->watchers()->count())->toBe(1);
});

it('rejects a second live primary watcher on the same case at the database level', function () {
    makeCaseWatcher($this->case, ['name' => 'First Primary']);

    expect(fn () => makeCaseWatcher($this->case, ['name' => 'Second Primary']))
        ->toThrow(QueryException::class);
});

it('allows a new primary once the previous one is soft-deleted', function () {
    $first = makeCaseWatcher($this->case, ['name' => 'First Primary']);
    $first->delete();

    $second = makeCaseWatcher($this->case, ['name' => 'Second Primary']);

    expect($second->is_primary)->toBeTrue()
        ->and(CaseWatcher::withTrashed()->count())->toBe(2);
});

it('allows two non-primary watchers on the same case', function () {
    makeCaseWatcher($this->case, ['name' => 'Primary', 'is_primary' => true]);
    makeCaseWatcher($this->case, ['name' => 'Secondary', 'is_primary' => false]);
    makeCaseWatcher($this->case, ['name' => 'Tertiary', 'is_primary' => false]);

    expect($this->case->watchers()->count())->toBe(3);
});

it('allows the same watcher to be primary on two different cases', function () {
    $otherCase = CaseModel::create([
        'patient_id' => $this->patient->id, 'assigned_user_id' => $this->user->id,
        'case_code' => 'CASE-'.uniqid(), 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'ER', 'date_opened' => now(),
    ]);

    makeCaseWatcher($this->case, ['name' => 'Maria Reyes']);
    $onOtherCase = makeCaseWatcher($otherCase, ['name' => 'Maria Reyes']);

    expect($onOtherCase->is_primary)->toBeTrue();
});

it('rejects a duplicate pass number', function () {
    makeCaseWatcher($this->case, ['name' => 'First', 'is_primary' => true, 'pass_number' => 'PASS-0001']);

    expect(fn () => makeCaseWatcher($this->case, ['name' => 'Second', 'is_primary' => false, 'pass_number' => 'PASS-0001']))
        ->toThrow(QueryException::class);
});

it('sets waiver columns on a case, nullable by default', function () {
    $this->case->refresh();

    expect($this->case->watcher_waiver_reason)->toBeNull()
        ->and($this->case->watcher_legacy_exempt)->toBeFalse();

    $this->case->update([
        'watcher_waiver_reason' => 'unaccompanied',
        'watcher_waiver_note' => 'Found unconscious, no companion.',
        'watcher_waived_by' => $this->user->id,
        'watcher_waived_at' => now(),
    ]);

    expect($this->case->refresh()->watcher_waiver_reason)->toBe('unaccompanied')
        ->and($this->case->watcher_waived_by)->toBe($this->user->id);
});

it('seeds the watcher relationship master list', function () {
    $this->seed(WatcherRelationshipTypeSeeder::class);

    expect(WatcherRelationshipType::count())->toBe(13)
        ->and(WatcherRelationshipType::where('code', 'barangay_official')->value('name'))->toBe('Barangay Official');

    // Idempotent: seeding twice must not create duplicates.
    $this->seed(WatcherRelationshipTypeSeeder::class);
    expect(WatcherRelationshipType::count())->toBe(13);
});

it('exposes the watcher relationship types through the reference lookup', function () {
    $this->seed(WatcherRelationshipTypeSeeder::class);
    Sanctum::actingAs($this->user);

    $this->getJson('/api/watcher-relationship-types')
        ->assertOk()
        ->assertJsonCount(13, 'data')
        ->assertJsonPath('data.0.name', 'Barangay Official'); // alphabetical
});

it('rejects the watcher relationship type lookup without a token', function () {
    $this->getJson('/api/watcher-relationship-types')->assertUnauthorized();
});
