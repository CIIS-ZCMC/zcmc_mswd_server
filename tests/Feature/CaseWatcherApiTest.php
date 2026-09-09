<?php

use App\Models\CaseModel;
use App\Models\CaseWatcher;
use App\Models\Patient;
use App\Models\PatientWatcher;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\WatcherRelationshipTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->seed(WatcherRelationshipTypeSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
});

function watcherApiUser(string $role = 'Case Manager'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function watcherApiPatient(): Patient
{
    return Patient::create([
        'sector_id' => test()->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
        'birthdate' => now()->subYears(30)->toDateString(),
    ]);
}

function watcherApiCase(Patient $patient, User $worker, array $overrides = []): CaseModel
{
    return CaseModel::create(array_merge([
        'patient_id' => $patient->id, 'assigned_user_id' => $worker->id,
        'case_code' => 'CASE-'.uniqid(), 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'inpatient', 'date_opened' => now(),
    ], $overrides));
}

it('lists watchers for a case', function () {
    $worker = watcherApiUser();
    Sanctum::actingAs($worker);
    $case = watcherApiCase(watcherApiPatient(), $worker);
    CaseWatcher::create(['case_id' => $case->id, 'name' => 'Maria', 'relationship' => 'spouse', 'added_by' => $worker->id]);

    $this->getJson("/api/cases/{$case->id}/watchers")->assertOk()->assertJsonCount(1, 'data');
});

it('creates an inline watcher and its directory entry together', function () {
    $worker = watcherApiUser();
    Sanctum::actingAs($worker);
    $case = watcherApiCase(watcherApiPatient(), $worker);

    $response = $this->postJson("/api/cases/{$case->id}/watchers", [
        'name' => 'Maria Reyes', 'relationship' => 'spouse', 'is_primary' => true,
    ])->assertCreated();

    $response->assertJsonPath('data.name', 'Maria Reyes')
        ->assertJsonPath('data.is_primary', true)
        ->assertJsonPath('data.patient_watcher_id', fn ($id) => is_int($id));

    expect(PatientWatcher::where('patient_id', $case->patient_id)->count())->toBe(1);
});

it('creates a watcher by linking an existing directory entry, snapshotting its fields', function () {
    $worker = watcherApiUser();
    Sanctum::actingAs($worker);
    $patient = watcherApiPatient();
    $case = watcherApiCase($patient, $worker);
    $directoryEntry = PatientWatcher::create([
        'patient_id' => $patient->id, 'name' => 'Pedro Reyes', 'relationship' => 'parent', 'contact_number' => '0917',
    ]);

    $this->postJson("/api/cases/{$case->id}/watchers", ['patient_watcher_id' => $directoryEntry->id])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Pedro Reyes')
        ->assertJsonPath('data.relationship', 'parent')
        ->assertJsonPath('data.contact_number', '0917')
        ->assertJsonPath('data.patient_watcher_id', $directoryEntry->id);

    expect(PatientWatcher::where('patient_id', $patient->id)->count())->toBe(1);
});

it('rejects a relationship not in the master list', function () {
    $worker = watcherApiUser();
    Sanctum::actingAs($worker);
    $case = watcherApiCase(watcherApiPatient(), $worker);

    $this->postJson("/api/cases/{$case->id}/watchers", ['name' => 'Maria', 'relationship' => 'best_friend'])
        ->assertUnprocessable()
        ->assertJsonValidationErrorFor('relationship');
});

it('demotes the existing primary when a new one is created as primary', function () {
    $worker = watcherApiUser();
    Sanctum::actingAs($worker);
    $case = watcherApiCase(watcherApiPatient(), $worker);
    $first = CaseWatcher::create([
        'case_id' => $case->id, 'name' => 'First', 'relationship' => 'spouse',
        'is_primary' => true, 'added_by' => $worker->id,
    ]);

    $this->postJson("/api/cases/{$case->id}/watchers", [
        'name' => 'Second', 'relationship' => 'parent', 'is_primary' => true,
    ])->assertCreated();

    expect($first->refresh()->is_primary)->toBeFalse();
});

it('updates a watcher and clears a field on an explicit null', function () {
    $worker = watcherApiUser();
    Sanctum::actingAs($worker);
    $case = watcherApiCase(watcherApiPatient(), $worker);
    $watcher = CaseWatcher::create([
        'case_id' => $case->id, 'name' => 'Maria', 'relationship' => 'spouse',
        'contact_number' => '0917', 'added_by' => $worker->id,
    ]);

    $this->putJson("/api/case-watchers/{$watcher->id}", ['contact_number' => null])
        ->assertOk()
        ->assertJsonPath('data.contact_number', null)
        ->assertJsonPath('data.name', 'Maria');

    expect($watcher->refresh()->contact_number)->toBeNull();
});

it('ignores is_primary on a generic update, keeping promotion atomic', function () {
    $worker = watcherApiUser();
    Sanctum::actingAs($worker);
    $case = watcherApiCase(watcherApiPatient(), $worker);
    $watcher = CaseWatcher::create([
        'case_id' => $case->id, 'name' => 'Maria', 'relationship' => 'spouse',
        'is_primary' => false, 'added_by' => $worker->id,
    ]);

    $this->putJson("/api/case-watchers/{$watcher->id}", ['is_primary' => true])->assertOk();

    expect($watcher->refresh()->is_primary)->toBeFalse();
});

it('blocks removing the last primary on a case that requires one', function () {
    $worker = watcherApiUser();
    Sanctum::actingAs($worker);
    $case = watcherApiCase(watcherApiPatient(), $worker, ['admission_type' => 'inpatient']);
    $watcher = CaseWatcher::create([
        'case_id' => $case->id, 'name' => 'Maria', 'relationship' => 'spouse',
        'is_primary' => true, 'added_by' => $worker->id,
    ]);

    $this->deleteJson("/api/case-watchers/{$watcher->id}")->assertUnprocessable();
    expect(CaseWatcher::find($watcher->id))->not->toBeNull();
});

it('allows removing the last watcher on an OPD case', function () {
    $worker = watcherApiUser();
    Sanctum::actingAs($worker);
    $case = watcherApiCase(watcherApiPatient(), $worker, ['admission_type' => 'OPD']);
    $watcher = CaseWatcher::create([
        'case_id' => $case->id, 'name' => 'Maria', 'relationship' => 'spouse',
        'is_primary' => true, 'added_by' => $worker->id,
    ]);

    $this->deleteJson("/api/case-watchers/{$watcher->id}")->assertNoContent();
});

it('promotes a watcher, demoting whoever previously held primary', function () {
    $worker = watcherApiUser();
    Sanctum::actingAs($worker);
    $case = watcherApiCase(watcherApiPatient(), $worker);
    $first = CaseWatcher::create([
        'case_id' => $case->id, 'name' => 'First', 'relationship' => 'spouse',
        'is_primary' => true, 'added_by' => $worker->id,
    ]);
    $second = CaseWatcher::create([
        'case_id' => $case->id, 'name' => 'Second', 'relationship' => 'parent',
        'is_primary' => false, 'added_by' => $worker->id,
    ]);

    $this->postJson("/api/case-watchers/{$second->id}/promote")
        ->assertOk()
        ->assertJsonPath('data.is_primary', true);

    expect($first->refresh()->is_primary)->toBeFalse();
});

it('issues and revokes a ward pass', function () {
    $worker = watcherApiUser();
    Sanctum::actingAs($worker);
    $case = watcherApiCase(watcherApiPatient(), $worker);
    $watcher = CaseWatcher::create([
        'case_id' => $case->id, 'name' => 'Maria', 'relationship' => 'spouse', 'added_by' => $worker->id,
    ]);

    $issued = $this->postJson("/api/case-watchers/{$watcher->id}/issue-pass", ['pass_valid_until' => '2026-12-31'])
        ->assertOk()
        ->assertJsonPath('data.pass_status', 'active');
    $passNumber = $issued->json('data.pass_number');
    expect($passNumber)->not->toBeNull();

    $this->postJson("/api/case-watchers/{$watcher->id}/revoke-pass")
        ->assertOk()
        ->assertJsonPath('data.pass_status', 'revoked')
        ->assertJsonPath('data.pass_number', $passNumber);
});

it('returns the watcher status for a case', function () {
    $worker = watcherApiUser();
    Sanctum::actingAs($worker);
    $case = watcherApiCase(watcherApiPatient(), $worker, ['admission_type' => 'inpatient']);

    $this->getJson("/api/cases/{$case->id}/watcher-status")
        ->assertOk()
        ->assertJson(['data' => [
            'requirement' => 'required', 'has_primary' => false, 'satisfied' => false, 'blocking' => true,
        ]]);
});

it('includes watchers and watcher_status on the case profile, but not on other case reads', function () {
    $worker = watcherApiUser();
    Sanctum::actingAs($worker);
    $case = watcherApiCase(watcherApiPatient(), $worker, ['admission_type' => 'inpatient']);
    CaseWatcher::create([
        'case_id' => $case->id, 'name' => 'Maria', 'relationship' => 'spouse',
        'is_primary' => true, 'added_by' => $worker->id,
    ]);

    $this->getJson("/api/cases/{$case->id}/profile")
        ->assertOk()
        ->assertJsonCount(1, 'data.watchers')
        ->assertJsonPath('data.watcher_status.blocking', false);

    // A plain case read (e.g. after creation) must not carry watcher_status —
    // it's tied to eager-loading watchers, which only profile() does.
    $this->getJson("/api/cases/{$case->id}")->assertOk()->assertJsonMissingPath('data.watcher_status');
});

it('gates the waiver endpoints on cases.waive_watcher, not cases.update', function () {
    $caseManager = watcherApiUser('Case Manager');
    Sanctum::actingAs($caseManager);
    $case = watcherApiCase(watcherApiPatient(), $caseManager, ['admission_type' => 'inpatient']);

    $this->postJson("/api/cases/{$case->id}/watcher-waiver", ['watcher_waiver_reason' => 'unaccompanied'])
        ->assertForbidden();

    Sanctum::actingAs(watcherApiUser('MSS Head'));
    $this->postJson("/api/cases/{$case->id}/watcher-waiver", ['watcher_waiver_reason' => 'unaccompanied'])
        ->assertOk()
        ->assertJsonPath('data.watcher_status', null); // CaseModelResource without watchers loaded

    $this->getJson("/api/cases/{$case->id}/watcher-status")
        ->assertOk()
        ->assertJsonPath('data.requirement', 'waived');

    $this->deleteJson("/api/cases/{$case->id}/watcher-waiver")->assertOk();
    $this->getJson("/api/cases/{$case->id}/watcher-status")
        ->assertOk()
        ->assertJsonPath('data.requirement', 'required');
});

it('forbids managing watchers without cases.update', function () {
    Sanctum::actingAs(watcherApiUser('Processor')); // cases.view only
    $case = watcherApiCase(watcherApiPatient(), watcherApiUser('Case Manager'));

    $this->postJson("/api/cases/{$case->id}/watchers", ['name' => 'Maria', 'relationship' => 'spouse'])
        ->assertForbidden();
});
