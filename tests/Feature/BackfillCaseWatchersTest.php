<?php

use App\Enums\WatcherRequirement;
use App\Models\CaseModel;
use App\Models\CaseWatcher;
use App\Models\Patient;
use App\Models\PatientWatcher;
use App\Models\Sector;
use App\Models\User;
use App\Services\WatcherRequirementService;
use Database\Seeders\WatcherRelationshipTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(WatcherRelationshipTypeSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->worker = User::factory()->create();
});

function backfillPatient(array $overrides = []): Patient
{
    return Patient::create(array_merge([
        'sector_id' => test()->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
        'birthdate' => now()->subYears(30)->toDateString(),
    ], $overrides));
}

function backfillCase(Patient $patient, array $overrides = []): CaseModel
{
    return CaseModel::create(array_merge([
        'patient_id' => $patient->id, 'assigned_user_id' => test()->worker->id,
        'case_code' => 'CASE-'.uniqid(), 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'inpatient', 'date_opened' => now(),
    ], $overrides));
}

it('copies a patient\'s directory watchers onto their most recent case', function () {
    $patient = backfillPatient();
    $older = backfillCase($patient, ['date_opened' => now()->subDays(10)]);
    $recent = backfillCase($patient, ['date_opened' => now()]);
    $directoryEntry = PatientWatcher::create([
        'patient_id' => $patient->id, 'name' => 'Maria Reyes', 'relationship' => 'spouse',
        'contact_number' => '0917', 'is_primary' => true,
    ]);

    $this->artisan('mss:backfill-case-watchers')->assertSuccessful();

    expect(CaseWatcher::where('case_id', $recent->id)->count())->toBe(1)
        ->and(CaseWatcher::where('case_id', $older->id)->count())->toBe(0);

    $watcher = CaseWatcher::where('case_id', $recent->id)->first();
    expect($watcher->patient_watcher_id)->toBe($directoryEntry->id)
        ->and($watcher->name)->toBe('Maria Reyes')
        ->and($watcher->relationship)->toBe('spouse')
        ->and($watcher->contact_number)->toBe('0917')
        ->and($watcher->is_primary)->toBeTrue()
        ->and($watcher->added_by)->toBe($recent->assigned_user_id);
});

it('demotes a second legacy is_primary row so the unique primary invariant holds', function () {
    $patient = backfillPatient();
    $case = backfillCase($patient);
    PatientWatcher::create(['patient_id' => $patient->id, 'name' => 'First', 'relationship' => 'spouse', 'is_primary' => true]);
    PatientWatcher::create(['patient_id' => $patient->id, 'name' => 'Second', 'relationship' => 'parent', 'is_primary' => true]);

    $this->artisan('mss:backfill-case-watchers')->assertSuccessful();

    expect(CaseWatcher::where('case_id', $case->id)->where('is_primary', true)->count())->toBe(1)
        ->and(CaseWatcher::where('case_id', $case->id)->count())->toBe(2);
});

it('falls back to "other" for a legacy relationship not in the master list, and matches case-insensitively otherwise', function () {
    $patient = backfillPatient();
    $case = backfillCase($patient);
    PatientWatcher::create(['patient_id' => $patient->id, 'name' => 'Free Text', 'relationship' => 'best friend forever']);
    PatientWatcher::create(['patient_id' => $patient->id, 'name' => 'Cased Differently', 'relationship' => 'SPOUSE']);

    $this->artisan('mss:backfill-case-watchers')->assertSuccessful();

    expect(CaseWatcher::where('name', 'Free Text')->value('relationship'))->toBe('other')
        ->and(CaseWatcher::where('name', 'Cased Differently')->value('relationship'))->toBe('spouse');
});

it('skips patients with no cases or no directory watchers', function () {
    backfillPatient(); // no case at all
    $withCaseNoWatchers = backfillPatient();
    backfillCase($withCaseNoWatchers);

    $this->artisan('mss:backfill-case-watchers')->assertSuccessful();

    expect(CaseWatcher::count())->toBe(0);
});

it('is idempotent: running twice creates no duplicate rows', function () {
    $patient = backfillPatient();
    backfillCase($patient);
    PatientWatcher::create(['patient_id' => $patient->id, 'name' => 'Maria', 'relationship' => 'spouse', 'is_primary' => true]);

    $this->artisan('mss:backfill-case-watchers')->assertSuccessful();
    $this->artisan('mss:backfill-case-watchers')->assertSuccessful();

    expect(CaseWatcher::count())->toBe(1);
});

it('makes no changes on --dry-run', function () {
    $patient = backfillPatient();
    backfillCase($patient, ['date_opened' => now()->subYear()]);
    PatientWatcher::create(['patient_id' => $patient->id, 'name' => 'Maria', 'relationship' => 'spouse', 'is_primary' => true]);

    $this->artisan('mss:backfill-case-watchers --dry-run')->assertSuccessful();

    expect(CaseWatcher::count())->toBe(0)
        ->and(CaseModel::where('watcher_legacy_exempt', true)->count())->toBe(0);
});

it('exempts cases opened before the cutoff and leaves later cases alone', function () {
    $patient = backfillPatient();
    $legacy = backfillCase($patient, ['date_opened' => '2026-01-01']);
    $current = backfillCase($patient, ['case_code' => 'CASE-'.uniqid(), 'date_opened' => now()]);

    $this->artisan('mss:backfill-case-watchers --before=2026-06-01')->assertSuccessful();

    expect($legacy->refresh()->watcher_legacy_exempt)->toBeTrue()
        ->and($current->refresh()->watcher_legacy_exempt)->toBeFalse();
});

it('resolves a legacy-exempt case as waived even when it would otherwise be required', function () {
    $patient = backfillPatient();
    $case = backfillCase($patient, ['date_opened' => '2026-01-01', 'admission_type' => 'inpatient']);

    $this->artisan('mss:backfill-case-watchers --before=2026-06-01')->assertSuccessful();

    expect(app(WatcherRequirementService::class)->resolve($case->refresh()))->toBe(WatcherRequirement::Waived);
});
