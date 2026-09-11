<?php

use App\Models\Patient;
use App\Models\PatientCaretaker;
use App\Models\Sector;
use App\Models\User;
use App\Services\PatientCaretakerService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
});

function custodyUser(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

/**
 * Someone who merely holds an assignment. They need no role of their own — the
 * permission check is on the actor making the assignment, not its subject.
 */
function assigneeUser(): User
{
    return User::factory()->create();
}

function caretakerFor(Patient $patient, User $user, array $overrides = []): PatientCaretaker
{
    return PatientCaretaker::create(array_merge([
        'patient_id' => $patient->id,
        'user_id' => $user->id,
        'role' => 'social_worker',
        'assigned_date' => now(),
        'is_active' => true,
    ], $overrides));
}

it('rejects a second active caretaker in the same role with a 422, not a 500', function () {
    $actor = custodyUser();
    Sanctum::actingAs($actor);
    caretakerFor($this->patient, assigneeUser());

    $this->postJson("/api/patients/{$this->patient->id}/caretakers", [
        'user_id' => assigneeUser()->id,
        'role' => 'social_worker',
        'assigned_date' => now()->toDateTimeString(),
    ])->assertStatus(422)->assertJsonValidationErrors('user_id');
});

it('allows a second active caretaker in a different role', function () {
    $actor = custodyUser();
    Sanctum::actingAs($actor);
    caretakerFor($this->patient, assigneeUser());

    $this->postJson("/api/patients/{$this->patient->id}/caretakers", [
        'user_id' => assigneeUser()->id,
        'role' => 'case_manager',
        'assigned_date' => now()->toDateTimeString(),
    ])->assertCreated();
});

it('does not let an inactive or soft-deleted row block a new assignment', function () {
    $inactive = caretakerFor($this->patient, assigneeUser(), ['is_active' => false]);
    $deleted = caretakerFor($this->patient, assigneeUser(), ['role' => 'nurse']);
    $deleted->delete();

    expect(fn () => caretakerFor($this->patient, assigneeUser()))->not->toThrow(Exception::class)
        ->and(fn () => caretakerFor($this->patient, assigneeUser(), ['role' => 'nurse']))
        ->not->toThrow(Exception::class)
        ->and($inactive->fresh()->is_active)->toBeFalse();
});

it('stamps who made the assignment', function () {
    $actor = custodyUser();
    Sanctum::actingAs($actor);

    $this->postJson("/api/patients/{$this->patient->id}/caretakers", [
        'user_id' => assigneeUser()->id,
        'role' => 'social_worker',
        'assigned_date' => now()->toDateTimeString(),
        'reason' => 'Initial intake assignment',
    ])->assertCreated()->assertJsonPath('data.reason', 'Initial intake assignment');

    expect(PatientCaretaker::latest('id')->first()->assigned_by)->toBe($actor->id);
});

it('records who ended an assignment and why', function () {
    $actor = custodyUser();
    Sanctum::actingAs($actor);
    $caretaker = caretakerFor($this->patient, assigneeUser());

    $this->patchJson("/api/caretakers/{$caretaker->id}/unassign", [
        'unassigned_reason' => 'Worker reassigned to another ward',
    ])->assertOk()->assertJsonPath('data.is_active', false);

    $caretaker->refresh();

    expect($caretaker->unassigned_by)->toBe($actor->id)
        ->and($caretaker->unassigned_reason)->toBe('Worker reassigned to another ward')
        ->and($caretaker->unassigned_date)->not->toBeNull();
});

it('reassigns in one step, linking the old row to its replacement', function () {
    $actor = custodyUser();
    Sanctum::actingAs($actor);
    $current = caretakerFor($this->patient, assigneeUser());
    $successor = assigneeUser();

    // 201, not 200: a handover creates the replacement assignment, and the
    // resource reports the status of the record it wraps.
    $response = $this->postJson("/api/caretakers/{$current->id}/reassign", [
        'user_id' => $successor->id,
        'reason' => 'Caseload rebalancing',
    ])->assertCreated()->assertJsonPath('data.user_id', $successor->id);

    $current->refresh();
    $replacement = PatientCaretaker::findOrFail($response->json('data.id'));

    expect($current->is_active)->toBeFalse()
        ->and($current->unassigned_by)->toBe($actor->id)
        ->and($current->unassigned_reason)->toBe('Caseload rebalancing')
        ->and($current->replaced_by_id)->toBe($replacement->id)
        ->and($replacement->is_active)->toBeTrue()
        ->and($replacement->role)->toBe($current->role)
        ->and($replacement->assigned_by)->toBe($actor->id);
});

it('leaves the original assignment intact when a reassignment fails', function () {
    $actor = custodyUser();
    $current = caretakerFor($this->patient, assigneeUser());

    // A user_id that does not exist trips the foreign key mid-transaction.
    expect(fn () => app(PatientCaretakerService::class)->reassign($current, 999999, $actor, 'x'))
        ->toThrow(Exception::class);

    $current->refresh();

    expect($current->is_active)->toBeTrue()
        ->and($current->unassigned_date)->toBeNull()
        ->and($current->replaced_by_id)->toBeNull()
        ->and(PatientCaretaker::where('patient_id', $this->patient->id)->count())->toBe(1);
});

it('refuses to reassign an assignment that has already ended', function () {
    Sanctum::actingAs(custodyUser());
    $ended = caretakerFor($this->patient, assigneeUser(), [
        'is_active' => false,
        'unassigned_date' => now(),
    ]);

    $this->postJson("/api/caretakers/{$ended->id}/reassign", [
        'user_id' => assigneeUser()->id,
    ])->assertStatus(422)->assertJsonValidationErrors('caretaker');
});

it('repairs drifted and duplicated rows before applying the guard', function () {
    $migration = require database_path(
        'migrations/2026_09_11_110000_add_accountability_to_patient_caretakers_table.php',
    );

    // Rebuild the pre-migration shape: the guard cannot exist while we seed
    // rows that contradict it.
    Schema::table('patient_caretakers', function ($table) {
        $table->dropUnique('uniq_active_patient_caretaker');
        $table->dropColumn('active_caretaker_guard');
    });

    $drifted = caretakerFor($this->patient, assigneeUser(), ['role' => 'nurse']);
    DB::table('patient_caretakers')->where('id', $drifted->id)
        ->update(['unassigned_date' => now(), 'is_active' => true]);

    $older = caretakerFor($this->patient, assigneeUser(), [
        'assigned_date' => now()->subDays(5),
    ]);
    $newer = caretakerFor($this->patient, assigneeUser(), [
        'assigned_date' => now(),
    ]);

    (fn () => $this->repairDriftedRows())->call($migration);

    expect($drifted->fresh()->is_active)->toBeFalse()
        ->and($older->fresh()->is_active)->toBeFalse()
        ->and($older->fresh()->unassigned_date)->not->toBeNull()
        // A repaired row is deliberately distinguishable from a real handover.
        ->and($older->fresh()->unassigned_reason)->toBeNull()
        ->and($newer->fresh()->is_active)->toBeTrue();
});
