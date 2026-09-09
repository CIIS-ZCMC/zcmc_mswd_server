<?php

use App\Models\CaseModel;
use App\Models\CaseWatcher;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use App\Services\CaseWatcherService;
use Database\Seeders\WatcherRelationshipTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(WatcherRelationshipTypeSeeder::class);
    $this->service = app(CaseWatcherService::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->user = User::factory()->create();
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
        'birthdate' => now()->subYears(30)->toDateString(),
    ]);
});

function serviceCase(Patient $patient, array $overrides = []): CaseModel
{
    return CaseModel::create(array_merge([
        'patient_id' => $patient->id, 'assigned_user_id' => test()->user->id,
        'case_code' => 'CASE-'.uniqid(), 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'inpatient', 'date_opened' => now(),
    ], $overrides));
}

it('rejects a relationship that is not in the seeded master list', function () {
    $case = serviceCase($this->patient);

    expect(fn () => $this->service->create([
        'case_id' => $case->id, 'name' => 'Maria', 'relationship' => 'best_friend', 'added_by' => $this->user->id,
    ]))->toThrow(ValidationException::class);
});

it('creates a watcher with a relationship from the master list', function () {
    $case = serviceCase($this->patient);

    $watcher = $this->service->create([
        'case_id' => $case->id, 'name' => 'Maria', 'relationship' => 'spouse',
        'is_primary' => true, 'added_by' => $this->user->id,
    ]);

    expect($watcher->relationship)->toBe('spouse')->and($watcher->is_primary)->toBeTrue();
});

it('atomically demotes the existing primary when a new primary is created for the same case', function () {
    $case = serviceCase($this->patient);
    $first = $this->service->create([
        'case_id' => $case->id, 'name' => 'First', 'relationship' => 'spouse',
        'is_primary' => true, 'added_by' => $this->user->id,
    ]);

    $second = $this->service->create([
        'case_id' => $case->id, 'name' => 'Second', 'relationship' => 'parent',
        'is_primary' => true, 'added_by' => $this->user->id,
    ]);

    expect($first->refresh()->is_primary)->toBeFalse()
        ->and($second->refresh()->is_primary)->toBeTrue();
});

it('promotes a watcher and demotes whoever previously held primary', function () {
    $case = serviceCase($this->patient);
    $first = $this->service->create([
        'case_id' => $case->id, 'name' => 'First', 'relationship' => 'spouse',
        'is_primary' => true, 'added_by' => $this->user->id,
    ]);
    $second = $this->service->create([
        'case_id' => $case->id, 'name' => 'Second', 'relationship' => 'parent',
        'is_primary' => false, 'added_by' => $this->user->id,
    ]);

    $this->service->promote($second);

    expect($first->refresh()->is_primary)->toBeFalse()
        ->and($second->refresh()->is_primary)->toBeTrue();
});

it('rejects removing the last primary watcher on a case that requires one', function () {
    $case = serviceCase($this->patient, ['admission_type' => 'inpatient']);
    $watcher = $this->service->create([
        'case_id' => $case->id, 'name' => 'Maria', 'relationship' => 'spouse',
        'is_primary' => true, 'added_by' => $this->user->id,
    ]);

    expect(fn () => $this->service->remove($watcher))->toThrow(ValidationException::class);
    expect(CaseWatcher::find($watcher->id))->not->toBeNull();
});

it('allows removing the last primary watcher on a case that does not require one', function () {
    $case = serviceCase($this->patient, ['admission_type' => 'OPD']);
    $watcher = $this->service->create([
        'case_id' => $case->id, 'name' => 'Maria', 'relationship' => 'spouse',
        'is_primary' => true, 'added_by' => $this->user->id,
    ]);

    expect($this->service->remove($watcher))->toBeTrue();
    expect(CaseWatcher::find($watcher->id))->toBeNull();
});

it('allows removing the last primary once a waiver is filed', function () {
    $case = serviceCase($this->patient, [
        'admission_type' => 'inpatient',
        'watcher_waiver_reason' => 'unaccompanied',
        'watcher_waived_by' => $this->user->id,
        'watcher_waived_at' => now(),
    ]);
    $watcher = $this->service->create([
        'case_id' => $case->id, 'name' => 'Maria', 'relationship' => 'spouse',
        'is_primary' => true, 'added_by' => $this->user->id,
    ]);

    expect($this->service->remove($watcher))->toBeTrue();
});

it('allows swapping the last primary by promoting a replacement first', function () {
    $case = serviceCase($this->patient, ['admission_type' => 'inpatient']);
    $outgoing = $this->service->create([
        'case_id' => $case->id, 'name' => 'Outgoing', 'relationship' => 'spouse',
        'is_primary' => true, 'added_by' => $this->user->id,
    ]);
    $incoming = $this->service->create([
        'case_id' => $case->id, 'name' => 'Incoming', 'relationship' => 'parent',
        'is_primary' => false, 'added_by' => $this->user->id,
    ]);

    $this->service->promote($incoming);
    expect($this->service->remove($outgoing))->toBeTrue();
});

it('issues sequential, never-reused pass numbers even after a revoke', function () {
    $case = serviceCase($this->patient);
    $watcher = $this->service->create([
        'case_id' => $case->id, 'name' => 'Maria', 'relationship' => 'spouse',
        'is_primary' => true, 'added_by' => $this->user->id,
    ]);

    $this->service->issuePass($watcher, '2026-12-31');
    $firstNumber = $watcher->refresh()->pass_number;
    expect($firstNumber)->not->toBeNull()->and($watcher->pass_status)->toBe('active');

    $this->service->revokePass($watcher);
    expect($watcher->refresh()->pass_status)->toBe('revoked');

    $second = $this->service->create([
        'case_id' => $case->id, 'name' => 'Second', 'relationship' => 'parent',
        'is_primary' => false, 'added_by' => $this->user->id,
    ]);
    $this->service->issuePass($second);

    expect($second->refresh()->pass_number)->not->toBe($firstNumber);
});
