<?php

use App\DTOs\CaseModelDto;
use App\Models\CaseActivity;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use App\Services\CaseModelService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
});

function caseUser(string $role = 'Case Manager'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function newCasePayload(int $patientId): array
{
    return [
        'patient_id' => $patientId,
        'case_type' => 'medical',
        'priority_level' => 'high',
        'admission_type' => 'ER',
    ];
}

/** Create an open case owned by the acting user, returning the record. */
function caseOpenFor(User $actor, Patient $patient): CaseModel
{
    return app(CaseModelService::class)->create(
        CaseModelDto::fromArray(newCasePayload($patient->id)),
        $actor,
    );
}

it('opens a case with an auto-generated code, defaults, and a milestone', function () {
    $worker = caseUser();
    Sanctum::actingAs($worker);

    $response = $this->postJson('/api/cases', newCasePayload($this->patient->id))
        ->assertCreated()
        ->assertJsonPath('data.status', 'open')
        ->assertJsonPath('data.assigned_user_id', $worker->id);

    $code = $response->json('data.case_code');
    expect($code)->toStartWith('CASE-'.now()->year.'-');

    $case = CaseModel::first();
    expect($case->date_opened)->not->toBeNull()
        ->and($case->activities()->where('activity_type', 'case_opened')->exists())->toBeTrue();
});

it('lists, shows and updates a case', function () {
    $worker = caseUser();
    Sanctum::actingAs($worker);
    $case = caseOpenFor($worker, $this->patient);

    $this->getJson('/api/cases')->assertOk()->assertJsonCount(1, 'data');
    $this->getJson("/api/cases/{$case->id}")->assertOk()->assertJsonPath('data.id', $case->id);
    $this->putJson("/api/cases/{$case->id}", ['priority_level' => 'low'])
        ->assertOk()->assertJsonPath('data.priority_level', 'low');
});

it('reassigns a case and records the previous worker', function () {
    $worker = caseUser('MSS Head');
    Sanctum::actingAs($worker);
    $case = caseOpenFor($worker, $this->patient);
    $other = caseUser('Case Manager');

    $this->postJson("/api/cases/{$case->id}/assign", ['assigned_user_id' => $other->id])
        ->assertOk()
        ->assertJsonPath('data.assigned_user_id', $other->id);

    $activity = CaseActivity::where('activity_type', 'case_reassigned')->first();
    expect($activity)->not->toBeNull()
        ->and($activity->previous_user_id)->toBe($worker->id);
});

it('closes a case, stamping the close date and milestone', function () {
    $worker = caseUser('MSS Head');
    Sanctum::actingAs($worker);
    $case = caseOpenFor($worker, $this->patient);

    $this->postJson("/api/cases/{$case->id}/close")
        ->assertOk()
        ->assertJsonPath('data.status', 'closed');

    expect($case->fresh()->date_closed)->not->toBeNull()
        ->and($case->activities()->where('activity_type', 'case_closed')->exists())->toBeTrue();
});

it('refers a case', function () {
    $worker = caseUser('MSS Head');
    Sanctum::actingAs($worker);
    $case = caseOpenFor($worker, $this->patient);

    $this->postJson("/api/cases/{$case->id}/refer", ['notes' => 'To LGU'])
        ->assertOk()
        ->assertJsonPath('data.status', 'referred');
});

it('blocks archiving an open case but allows a closed one, then restores', function () {
    $worker = caseUser('MSS Head');
    Sanctum::actingAs($worker);
    $case = caseOpenFor($worker, $this->patient);

    // Open → cannot archive
    $this->deleteJson("/api/cases/{$case->id}")->assertUnprocessable();
    expect($case->fresh()->trashed())->toBeFalse();

    // Close then archive
    app(CaseModelService::class)->close($case, $worker);
    $this->deleteJson("/api/cases/{$case->id}")->assertNoContent();
    expect($case->fresh()->trashed())->toBeTrue();

    $this->postJson("/api/cases/{$case->id}/restore")->assertOk();
    expect(CaseModel::find($case->id))->not->toBeNull();
});

it('returns the case profile and audit history', function () {
    $worker = caseUser('MSS Head');
    Sanctum::actingAs($worker);
    $case = caseOpenFor($worker, $this->patient);

    $this->getJson("/api/cases/{$case->id}/profile")
        ->assertOk()
        ->assertJsonPath('data.activities_count', fn ($c) => $c >= 0);

    expect(Activity::where('log_name', 'case_model')->exists())->toBeTrue();
    $this->getJson("/api/cases/{$case->id}/history")->assertOk();
    $this->getJson("/api/cases/{$case->id}/activities")
        ->assertOk()
        ->assertJsonPath('data.0.activity_type', 'case_opened');
});

it('forbids case access without cases.view', function () {
    $user = User::factory()->create(); // no roles
    Sanctum::actingAs($user);

    $this->getJson('/api/cases')->assertForbidden();
});

it('forbids creating a case without cases.create', function () {
    Sanctum::actingAs(caseUser('Processor')); // view only

    $this->postJson('/api/cases', newCasePayload($this->patient->id))->assertForbidden();
});

it('forbids deleting a case without cases.delete', function () {
    $worker = caseUser('Case Manager'); // no cases.delete
    Sanctum::actingAs($worker);
    $case = caseOpenFor($worker, $this->patient);

    $this->deleteJson("/api/cases/{$case->id}")->assertForbidden();
});
