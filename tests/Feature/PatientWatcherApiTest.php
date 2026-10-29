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
    $this->worker = User::factory()->create(['role' => 'Case Manager']);
    $this->worker->assignRole('Case Manager');
    $this->worker->givePermissionTo('patients.update'); // watchers and documents are patient records
    Sanctum::actingAs($this->worker);
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
        'birthdate' => now()->subYears(30)->toDateString(),
    ]);
});

function patientWatcherCase(array $overrides = []): CaseModel
{
    return CaseModel::create(array_merge([
        'patient_id' => test()->patient->id, 'assigned_user_id' => test()->worker->id,
        'case_code' => 'CASE-'.uniqid(), 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'OPD', 'date_opened' => now(),
    ], $overrides));
}

it('adds a watcher to a patient who has no case', function () {
    $this->postJson("/api/patients/{$this->patient->id}/watchers", [
        'name' => 'Maria Reyes', 'relationship_code' => 'spouse', 'contact_number' => '0917', 'address' => 'Zone 1',
    ])->assertCreated()
        ->assertJsonPath('data.name', 'Maria Reyes')
        ->assertJsonPath('data.first_name', 'Maria')
        ->assertJsonPath('data.last_name', 'Reyes')
        ->assertJsonPath('data.relationship_code', 'spouse')
        ->assertJsonPath('data.relationship_label', 'Spouse');

    $watcher = PatientWatcher::firstWhere('name', 'Maria Reyes');
    expect($watcher->patient_id)->toBe($this->patient->id)->and($watcher->added_by)->toBe($this->worker->id);
});

it('adds a watcher using separate last, first, and middle names', function () {
    $this->postJson("/api/patients/{$this->patient->id}/watchers", [
        'last_name' => 'San Juan',
        'first_name' => 'Juan',
        'middle_name' => 'Dela Cruz',
        'relationship_code' => 'barangay_official',
        'contact_number' => '+63 912 345 6789',
        'address' => 'Tetuan, Zamboanga City',
    ])->assertCreated()
        ->assertJsonPath('data.name', 'Juan Dela Cruz San Juan')
        ->assertJsonPath('data.first_name', 'Juan')
        ->assertJsonPath('data.middle_name', 'Dela Cruz')
        ->assertJsonPath('data.last_name', 'San Juan')
        ->assertJsonPath('data.contact_number', '+63 912 345 6789')
        ->assertJsonPath('data.address', 'Tetuan, Zamboanga City');

    $watcher = PatientWatcher::firstWhere('last_name', 'San Juan');
    expect($watcher->name)->toBe('Juan Dela Cruz San Juan')
        ->and($watcher->first_name)->toBe('Juan')
        ->and($watcher->middle_name)->toBe('Dela Cruz');
});

it('requires contact number and address when creating a watcher', function () {
    $this->postJson("/api/patients/{$this->patient->id}/watchers", [
        'first_name' => 'Juan',
        'last_name' => 'San Juan',
        'relationship_code' => 'spouse',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['contact_number', 'address']);
});

it('requires a known relationship code', function () {
    $this->postJson("/api/patients/{$this->patient->id}/watchers", ['name' => 'Maria', 'contact_number' => '0917', 'address' => 'City'])
        ->assertUnprocessable()->assertJsonValidationErrorFor('relationship_code');

    $this->postJson("/api/patients/{$this->patient->id}/watchers", ['name' => 'Maria', 'relationship_code' => 'best_friend', 'contact_number' => '0917', 'address' => 'City'])
        ->assertUnprocessable()->assertJsonValidationErrorFor('relationship_code');
});

it("lists a patient's watchers with the cases they are assigned to", function () {
    $case = patientWatcherCase(['case_code' => 'CASE-1', 'admission_type' => 'inpatient']);
    $assigned = assignWatcher(['case_id' => $case->id, 'name' => 'Maria', 'relationship' => 'spouse', 'is_primary' => true, 'added_by' => $this->worker->id]);
    PatientWatcher::create(['patient_id' => $this->patient->id, 'name' => 'Unassigned', 'relationship_code' => 'friend']);

    $response = $this->getJson("/api/patients/{$this->patient->id}/watchers")->assertOk()->assertJsonCount(2, 'data');

    $maria = collect($response->json('data'))->firstWhere('name', 'Maria');
    expect($maria['assignments'])->toHaveCount(1)
        ->and($maria['assignments'][0]['case_code'])->toBe('CASE-1')
        ->and($maria['assignments'][0]['is_primary'])->toBeTrue()
        ->and($assigned->patient_watcher_id)->toBe($maria['id']);
});

it('updates a watcher, clears a field on null, and cannot move it to another patient', function () {
    $other = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Bea', 'last_name' => 'Cruz', 'sex' => 'female',
    ]);
    $watcher = PatientWatcher::create([
        'patient_id' => $this->patient->id, 'name' => 'Maria', 'relationship_code' => 'spouse', 'contact_number' => '0917',
    ]);

    $this->putJson("/api/watchers/{$watcher->id}", ['contact_number' => null, 'patient_id' => $other->id, 'relationship_code' => 'child'])
        ->assertOk()
        ->assertJsonPath('data.contact_number', null)
        ->assertJsonPath('data.relationship_code', 'child');

    expect($watcher->refresh()->patient_id)->toBe($this->patient->id);
});

it('refuses to remove a watcher assigned to an open case', function () {
    $case = patientWatcherCase();
    $assignment = assignWatcher(['case_id' => $case->id, 'name' => 'Maria', 'relationship' => 'spouse', 'added_by' => $this->worker->id]);

    $this->deleteJson("/api/watchers/{$assignment->patient_watcher_id}")
        ->assertUnprocessable()->assertJsonValidationErrorFor('watcher');
    expect(PatientWatcher::find($assignment->patient_watcher_id))->not->toBeNull();

    // Unassigned, it can go.
    $this->deleteJson("/api/case-watchers/{$assignment->id}")->assertNoContent();
    $this->deleteJson("/api/watchers/{$assignment->patient_watcher_id}")->assertNoContent();
});

it('removes a watcher whose only assignments are on closed cases, keeping the history readable', function () {
    $case = patientWatcherCase(['status' => 'closed']);
    $assignment = assignWatcher(['case_id' => $case->id, 'name' => 'Maria', 'relationship' => 'spouse', 'added_by' => $this->worker->id]);

    $this->deleteJson("/api/watchers/{$assignment->patient_watcher_id}")->assertNoContent();

    $this->getJson("/api/cases/{$case->id}/watchers")->assertOk()->assertJsonPath('data.0.name', 'Maria');
    expect(CaseWatcher::count())->toBe(1);
});
