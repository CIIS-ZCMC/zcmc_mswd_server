<?php

use App\Filament\Resources\TurnaroundTargets\Pages\EditTurnaroundTarget;
use App\Filament\Resources\TurnaroundTargets\Pages\ListTurnaroundTargets;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\ServiceVisit;
use App\Models\TurnaroundTarget;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\TurnaroundTargetSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Livewire\Livewire;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->seed(TurnaroundTargetSeeder::class);

    $this->supervisor = targetUser('Admin');
    $this->worker = targetUser('Case Manager');
    $this->admin = targetUser('Admin');

    Carbon::setTestNow('2026-10-14 08:00:00');
});

afterEach(fn () => Carbon::setTestNow());

function targetUser(string $role, array $attributes = []): User
{
    $user = User::factory()->create(['role' => $role, ...$attributes]);
    $user->assignRole($role);

    return $user;
}

function targetPatient(): Patient
{
    return Patient::create([
        'sector_id' => Sector::firstOrCreate(['code' => 'MED'], ['name' => 'Medical'])->id,
        'first_name' => 'Juana',
        'last_name' => 'Dela Cruz',
        'sex' => 'female',
    ]);
}

// ── Seeding & List ───────────────────────────────────────────────────────────

it('seeds the three Citizen\'s Charter stages with their default minutes', function () {
    $targets = TurnaroundTarget::query()->orderBy('id')->get();

    expect($targets)->toHaveCount(3)
        ->and($targets->pluck('stage')->all())->toBe([
            TurnaroundTarget::STAGE_WAITING,
            TurnaroundTarget::STAGE_PROCESSING,
            TurnaroundTarget::STAGE_TOTAL,
        ])
        ->and($targets->pluck('minutes', 'stage')->all())->toBe([
            'waiting' => 30,
            'processing' => 60,
            'total' => 90,
        ])
        ->and($targets->every(fn (TurnaroundTarget $t) => $t->is_active))->toBeTrue();
});

it('lists the turnaround targets for any signed-in user', function () {
    Sanctum::actingAs($this->worker);

    $response = $this->getJson('/api/turnaround-targets')
        ->assertOk()
        ->assertJsonCount(3, 'data');

    $stages = $response->json('data.*.stage');
    expect($stages)->toBe(['waiting', 'processing', 'total']);

    $response->assertJsonStructure([
        'data' => [
            '*' => ['id', 'stage', 'label', 'description', 'minutes', 'is_active', 'created_at', 'updated_at'],
        ],
    ]);
});

it('shows a single turnaround target by id', function () {
    Sanctum::actingAs($this->worker);

    $target = TurnaroundTarget::where('stage', 'waiting')->firstOrFail();

    $this->getJson("/api/turnaround-targets/{$target->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $target->id)
        ->assertJsonPath('data.stage', 'waiting')
        ->assertJsonPath('data.label', 'Waiting Time')
        ->assertJsonPath('data.minutes', 30);
});

it('requires authentication to read targets', function () {
    $this->getJson('/api/turnaround-targets')->assertUnauthorized();
});

// ── Updating ─────────────────────────────────────────────────────────────────

it('allows a user with library.manage to update target minutes and active status', function () {
    Sanctum::actingAs($this->supervisor);

    $target = TurnaroundTarget::where('stage', 'waiting')->firstOrFail();

    $this->putJson("/api/turnaround-targets/{$target->id}", [
        'minutes' => 45,
        'is_active' => false,
    ])
        ->assertOk()
        ->assertJsonPath('data.minutes', 45)
        ->assertJsonPath('data.is_active', false);

    expect($target->fresh()->minutes)->toBe(45)
        ->and($target->fresh()->is_active)->toBeFalse();
});

it('forbids updating targets without library.manage permission', function () {
    Sanctum::actingAs($this->worker);

    $target = TurnaroundTarget::where('stage', 'waiting')->firstOrFail();

    $this->putJson("/api/turnaround-targets/{$target->id}", ['minutes' => 45])
        ->assertForbidden();
});

it('validates minutes and active status on update', function () {
    Sanctum::actingAs($this->supervisor);

    $target = TurnaroundTarget::where('stage', 'waiting')->firstOrFail();

    $this->putJson("/api/turnaround-targets/{$target->id}", ['minutes' => 0])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('minutes');

    $this->putJson("/api/turnaround-targets/{$target->id}", ['minutes' => 2000])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('minutes');

    $this->putJson("/api/turnaround-targets/{$target->id}", ['is_active' => 'invalid'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('is_active');
});

it('does not allow creating or deleting turnaround targets', function () {
    Sanctum::actingAs($this->supervisor);

    $target = TurnaroundTarget::firstOrFail();

    $this->postJson('/api/turnaround-targets', ['stage' => 'custom', 'minutes' => 10])
        ->assertMethodNotAllowed();

    $this->deleteJson("/api/turnaround-targets/{$target->id}")
        ->assertMethodNotAllowed();
});

// ── Compliance evaluation on ServiceVisitResource ────────────────────────────

it('evaluates whether a service visit is within target', function () {
    $patient = targetPatient();

    $visit = ServiceVisit::create([
        'patient_id' => $patient->id,
        'his_transaction_id' => 101,
        'status' => ServiceVisit::STATUS_WAITING,
        'arrived_at' => Carbon::parse('2026-10-14 08:00:00'),
        'received_by' => $this->supervisor->id,
    ]);

    Sanctum::actingAs($this->worker);

    // Waiting 20 min <= target 30 -> within_target.waiting is true
    Carbon::setTestNow('2026-10-14 08:20:00');
    $this->getJson("/api/patients/{$patient->id}/service-visits")
        ->assertOk()
        ->assertJsonPath('data.0.waiting_minutes', 20)
        ->assertJsonPath('data.0.within_target.waiting', true)
        ->assertJsonPath('data.0.within_target.processing', null)
        ->assertJsonPath('data.0.within_target.total', true);

    // Waiting 40 min > target 30 -> within_target.waiting is false
    Carbon::setTestNow('2026-10-14 08:40:00');
    $this->getJson("/api/patients/{$patient->id}/service-visits")
        ->assertOk()
        ->assertJsonPath('data.0.waiting_minutes', 40)
        ->assertJsonPath('data.0.within_target.waiting', false);

    // Start visit at 08:40
    $visit->update([
        'status' => ServiceVisit::STATUS_IN_PROGRESS,
        'started_at' => Carbon::parse('2026-10-14 08:40:00'),
        'served_by' => $this->worker->id,
    ]);

    // Processing for 50 min <= target 60 -> true
    Carbon::setTestNow('2026-10-14 09:30:00');
    $this->getJson("/api/patients/{$patient->id}/service-visits")
        ->assertOk()
        ->assertJsonPath('data.0.processing_minutes', 50)
        ->assertJsonPath('data.0.within_target.processing', true);

    // Processing for 70 min > target 60 -> false
    Carbon::setTestNow('2026-10-14 09:50:00');
    $this->getJson("/api/patients/{$patient->id}/service-visits")
        ->assertOk()
        ->assertJsonPath('data.0.processing_minutes', 70)
        ->assertJsonPath('data.0.within_target.processing', false);

    // Complete visit at 09:50 (total = 110 min > target 90)
    $visit->update([
        'status' => ServiceVisit::STATUS_COMPLETED,
        'completed_at' => Carbon::parse('2026-10-14 09:50:00'),
        'completed_by' => $this->worker->id,
    ]);

    $this->getJson("/api/patients/{$patient->id}/service-visits")
        ->assertOk()
        ->assertJsonPath('data.0.within_target.waiting', false)
        ->assertJsonPath('data.0.within_target.processing', false)
        ->assertJsonPath('data.0.within_target.total', false);
});

it('returns null for within_target flags on cancelled visits', function () {
    $patient = targetPatient();

    ServiceVisit::create([
        'patient_id' => $patient->id,
        'his_transaction_id' => 102,
        'status' => ServiceVisit::STATUS_CANCELLED,
        'arrived_at' => Carbon::parse('2026-10-14 08:00:00'),
        'cancelled_at' => Carbon::parse('2026-10-14 08:15:00'),
        'cancel_reason' => 'Patient left',
        'received_by' => $this->supervisor->id,
        'cancelled_by' => $this->supervisor->id,
    ]);

    Sanctum::actingAs($this->worker);

    $this->getJson("/api/patients/{$patient->id}/service-visits")
        ->assertOk()
        ->assertJsonPath('data.0.within_target.waiting', null)
        ->assertJsonPath('data.0.within_target.processing', null)
        ->assertJsonPath('data.0.within_target.total', null);
});

it('returns null for inactive targets', function () {
    $patient = targetPatient();

    TurnaroundTarget::where('stage', 'waiting')->update(['is_active' => false]);

    ServiceVisit::create([
        'patient_id' => $patient->id,
        'his_transaction_id' => 103,
        'status' => ServiceVisit::STATUS_WAITING,
        'arrived_at' => Carbon::parse('2026-10-14 08:00:00'),
        'received_by' => $this->supervisor->id,
    ]);

    Sanctum::actingAs($this->worker);

    $this->getJson("/api/patients/{$patient->id}/service-visits")
        ->assertOk()
        ->assertJsonPath('data.0.within_target.waiting', null)
        ->assertJsonPath('data.0.within_target.total', true);
});

// ── Filament ─────────────────────────────────────────────────────────────────

it('manages turnaround targets in Filament', function () {
    actingAs($this->admin);

    $targets = TurnaroundTarget::all();

    Livewire::test(ListTurnaroundTargets::class)
        ->assertOk()
        ->assertCanSeeTableRecords($targets);

    $waiting = TurnaroundTarget::where('stage', 'waiting')->firstOrFail();

    Livewire::test(EditTurnaroundTarget::class, ['record' => $waiting->getRouteKey()])
        ->assertOk()
        ->fillForm([
            'minutes' => 40,
            'is_active' => true,
        ])
        ->call('save')
        ->assertHasNoFormErrors();

    expect($waiting->fresh()->minutes)->toBe(40);
});

it('forbids Filament turnaround targets page for non-settings managers', function () {
    actingAs($this->worker);

    Livewire::test(ListTurnaroundTargets::class)->assertForbidden();
});
