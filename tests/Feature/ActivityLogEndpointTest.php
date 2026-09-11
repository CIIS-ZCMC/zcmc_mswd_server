<?php

use App\Models\Assessment;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\PatientCaretaker;
use App\Models\PatientWatcher;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
    $this->worker = User::factory()->create();
});

function auditUser(string $role): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function caseFor(Patient $patient, User $worker, bool $protective = false): CaseModel
{
    return CaseModel::create([
        'patient_id' => $patient->id,
        'case_code' => 'CASE-'.fake()->unique()->numerify('####'),
        'case_type' => 'medical',
        'priority_level' => 'high',
        'admission_type' => 'ER',
        'status' => CaseModel::STATUS_OPEN,
        'assigned_user_id' => $worker->id,
        'date_opened' => now(),
        'is_protective' => $protective,
    ]);
}

it('gates the global log behind audit.view', function () {
    Sanctum::actingAs(auditUser('Case Manager'));

    $this->getJson('/api/activity-log')->assertForbidden();
});

it('returns a paginated global log to a permitted user', function () {
    Sanctum::actingAs(auditUser('MSS Head'));
    caseFor($this->patient, $this->worker);

    $this->getJson('/api/activity-log')
        ->assertOk()
        ->assertJsonStructure(['data', 'links', 'meta'])
        ->assertJsonPath('meta.per_page', 25);
});

it('caps the page size at 100', function () {
    Sanctum::actingAs(auditUser('MSS Head'));

    $this->getJson('/api/activity-log?per_page=500')
        ->assertOk()
        ->assertJsonPath('meta.per_page', 100);
});

it('filters the log by patient, event and subject type', function () {
    Sanctum::actingAs(auditUser('MSS Head'));
    $other = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Bea', 'last_name' => 'Santos', 'sex' => 'female',
    ]);
    PatientWatcher::create(['patient_id' => $this->patient->id, 'name' => 'Maria', 'relationship' => 'spouse']);
    PatientWatcher::create(['patient_id' => $other->id, 'name' => 'Jose', 'relationship' => 'parent']);

    $mine = $this->getJson("/api/activity-log?patient_id={$this->patient->id}")->assertOk();
    expect(collect($mine->json('data'))->pluck('patient_id')->unique()->all())
        ->toBe([$this->patient->id]);

    // subject_type accepts the class basename the resource emits.
    $watchers = $this->getJson('/api/activity-log?subject_type=PatientWatcher&event=created')->assertOk();
    expect(collect($watchers->json('data'))->pluck('subject_type')->unique()->all())
        ->toBe(['PatientWatcher']);
});

it('serves the inline per-record drill-down from the same endpoint', function () {
    Sanctum::actingAs(auditUser('MSS Head'));
    $watcher = PatientWatcher::create([
        'patient_id' => $this->patient->id, 'name' => 'Maria', 'relationship' => 'spouse',
    ]);
    PatientWatcher::create(['patient_id' => $this->patient->id, 'name' => 'Other', 'relationship' => 'parent']);

    $response = $this->getJson("/api/activity-log?subject_type=PatientWatcher&subject_id={$watcher->id}")
        ->assertOk();

    expect(collect($response->json('data'))->pluck('subject_id')->unique()->all())->toBe([$watcher->id]);
});

it('labels each row with a human-readable subject', function () {
    Sanctum::actingAs(auditUser('MSS Head'));
    PatientWatcher::create(['patient_id' => $this->patient->id, 'name' => 'Maria Cruz', 'relationship' => 'spouse']);

    $response = $this->getJson('/api/activity-log?subject_type=PatientWatcher')->assertOk();

    expect($response->json('data.0.subject_label'))->toBe('PatientWatcher: Maria Cruz');
});

describe('the protective-case filter', function () {
    beforeEach(function () {
        $this->protectiveCase = caseFor($this->patient, $this->worker, protective: true);
        $this->ordinaryCase = caseFor($this->patient, $this->worker);

        Assessment::create([
            'case_id' => $this->protectiveCase->id, 'created_by' => $this->worker->id, 'classification' => 'A',
        ]);
        Assessment::create([
            'case_id' => $this->ordinaryCase->id, 'created_by' => $this->worker->id, 'classification' => 'B',
        ]);
    });

    it('hides protective rows from a user without audit.view_protective', function () {
        // Supervisor has audit.view but not audit.view_protective.
        Sanctum::actingAs(auditUser('Supervisor'));

        $caseIds = collect($this->getJson('/api/activity-log')->assertOk()->json('data'))
            ->pluck('case_id')
            ->filter()
            ->unique();

        expect($caseIds)->not->toContain($this->protectiveCase->id)
            ->and($caseIds)->toContain($this->ordinaryCase->id);
    });

    it('shows protective rows to a user with the permission', function () {
        Sanctum::actingAs(auditUser('MSS Head'));

        $caseIds = collect($this->getJson('/api/activity-log')->assertOk()->json('data'))
            ->pluck('case_id')
            ->filter()
            ->unique();

        expect($caseIds)->toContain($this->protectiveCase->id, $this->ordinaryCase->id);
    });

    it('applies to the patient history endpoint too', function () {
        Sanctum::actingAs(auditUser('Supervisor'));

        $caseIds = collect($this->getJson("/api/patients/{$this->patient->id}/history")->assertOk()->json('data'))
            ->pluck('case_id')
            ->filter()
            ->unique();

        expect($caseIds)->not->toContain($this->protectiveCase->id);
    });

    it('applies to the case history endpoint too', function () {
        Sanctum::actingAs(auditUser('Supervisor'));

        $this->getJson("/api/cases/{$this->protectiveCase->id}/history")
            ->assertOk()
            ->assertJsonCount(0, 'data');
    });

    it('keeps patient-level rows visible — the documented residual', function () {
        Sanctum::actingAs(auditUser('Supervisor'));
        PatientWatcher::create(['patient_id' => $this->patient->id, 'name' => 'Maria', 'relationship' => 'spouse']);

        // Not case-attached, so nothing ties it to the protective episode. The
        // Protective Cases module owns patient-level restriction.
        $subjects = collect($this->getJson("/api/patients/{$this->patient->id}/history")->assertOk()->json('data'))
            ->pluck('subject_type');

        expect($subjects)->toContain('PatientWatcher');
    });
});

describe('the combined caretake read', function () {
    it('returns active and past custody alongside recent activity', function () {
        Sanctum::actingAs(auditUser('MSS Head'));

        $active = PatientCaretaker::create([
            'patient_id' => $this->patient->id, 'user_id' => $this->worker->id,
            'role' => 'social_worker', 'assigned_date' => now(), 'is_active' => true,
        ]);
        $past = PatientCaretaker::create([
            'patient_id' => $this->patient->id, 'user_id' => $this->worker->id,
            'role' => 'nurse', 'assigned_date' => now()->subMonth(),
            'unassigned_date' => now()->subDay(), 'is_active' => false,
        ]);

        $response = $this->getJson("/api/patients/{$this->patient->id}/caretake")
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'caretakers' => ['active', 'history'],
                    'recent_activity',
                ],
            ]);

        expect(collect($response->json('data.caretakers.active'))->pluck('id')->all())->toBe([$active->id])
            ->and(collect($response->json('data.caretakers.history'))->pluck('id')->all())->toBe([$past->id])
            ->and($response->json('data.recent_activity'))->not->toBeEmpty();
    });

    it('is gated behind patients.view', function () {
        $user = User::factory()->create(['role' => 'Processor']);
        $user->syncRoles([]);
        Sanctum::actingAs($user);

        $this->getJson("/api/patients/{$this->patient->id}/caretake")->assertForbidden();
    });
});
