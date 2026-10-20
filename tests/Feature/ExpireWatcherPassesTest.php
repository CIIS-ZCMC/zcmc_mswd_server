<?php

use App\Models\CaseModel;
use App\Models\CaseWatcher;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\WatcherRelationshipTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(WatcherRelationshipTypeSeeder::class);
    $sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->worker = User::factory()->create();
    $patient = Patient::create(['sector_id' => $sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female']);
    $this->case = CaseModel::create([
        'patient_id' => $patient->id, 'assigned_user_id' => $this->worker->id,
        'case_code' => 'CASE-1', 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'inpatient', 'date_opened' => now(),
    ]);
});

function passWatcher(array $overrides = []): CaseWatcher
{
    return assignWatcher(array_merge([
        'case_id' => test()->case->id, 'name' => 'Maria', 'relationship' => 'spouse', 'added_by' => test()->worker->id,
        'pass_number' => 'PASS-'.uniqid(), 'pass_status' => 'active', 'pass_valid_until' => now()->addWeek()->toDateString(),
    ], $overrides));
}

it('expires active passes whose valid-until date has passed', function () {
    $lapsed = passWatcher(['pass_valid_until' => now()->subDay()->toDateString()]);
    $valid = passWatcher(['pass_valid_until' => now()->addDay()->toDateString()]);
    $today = passWatcher(['pass_valid_until' => now()->toDateString()]);

    $this->artisan('mss:expire-watcher-passes')->assertSuccessful();

    expect($lapsed->refresh()->pass_status)->toBe('expired')
        ->and($valid->refresh()->pass_status)->toBe('active')
        ->and($today->refresh()->pass_status)->toBe('active');
});

it('leaves revoked passes, passes without a date and watchers without a pass alone', function () {
    $revoked = passWatcher(['pass_status' => 'revoked', 'pass_valid_until' => now()->subDay()->toDateString()]);
    $open = passWatcher(['pass_valid_until' => null]);
    $none = passWatcher(['pass_number' => null, 'pass_valid_until' => now()->subDay()->toDateString()]);

    $this->artisan('mss:expire-watcher-passes')->assertSuccessful();

    expect($revoked->refresh()->pass_status)->toBe('revoked')
        ->and($open->refresh()->pass_status)->toBe('active')
        ->and($none->refresh()->pass_status)->toBe('active');
});

it('records the expiry in the audit log', function () {
    $lapsed = passWatcher(['pass_valid_until' => now()->subDay()->toDateString()]);

    $this->artisan('mss:expire-watcher-passes')->assertSuccessful();

    expect(Activity::where('subject_type', 'CaseWatcher')->orWhere('subject_type', CaseWatcher::class)
        ->where('subject_id', $lapsed->id)->where('event', 'updated')->exists())->toBeTrue();
});
