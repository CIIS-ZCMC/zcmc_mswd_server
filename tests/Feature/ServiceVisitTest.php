<?php

use App\Models\Activity;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\ServiceVisit;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->desk = queueWorker('Processor', ['employee_name' => 'Ana Desk']);
    $this->worker = queueWorker('Case Manager', ['employee_name' => 'Mitchelle O. Sanico, RSW']);
    $this->patient = queuePatient('Maria', 'Dela Cruz', ['hospital_id' => 1702854]);

    Carbon::setTestNow('2026-10-14 08:00:00');
});

afterEach(fn () => Carbon::setTestNow());

function queueWorker(string $role, array $attributes = []): User
{
    $user = User::factory()->create(['role' => $role, ...$attributes]);
    $user->assignRole($role);

    return $user;
}

function queuePatient(string $first, string $last, array $attributes = []): Patient
{
    return Patient::create([
        'sector_id' => Sector::firstOrCreate(['code' => 'MED'], ['name' => 'Medical'])->id,
        'first_name' => $first, 'last_name' => $last, 'sex' => 'female',
        ...$attributes,
    ]);
}

function queueVisit(Patient $patient, User $receivedBy, array $attributes = []): ServiceVisit
{
    return ServiceVisit::create([
        'patient_id' => $patient->id, 'his_transaction_id' => 555,
        'status' => ServiceVisit::STATUS_WAITING, 'arrived_at' => now(),
        'received_by' => $receivedBy->id,
        ...$attributes,
    ]);
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

it('times a patient in, stamped by the server and the caller', function () {
    Sanctum::actingAs($this->desk);

    $this->postJson("/api/patients/{$this->patient->id}/service-visits", [
        'his_transaction_id' => 555, 'purpose' => 'Guarantee letter',
        // Ignored: stamps and users never come from the body.
        'arrived_at' => '2020-01-01 00:00:00', 'received_by' => $this->worker->id,
    ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'waiting')
        ->assertJsonPath('data.his_transaction_id', 555)
        ->assertJsonPath('data.purpose', 'Guarantee letter')
        ->assertJsonPath('data.received_by.name', 'Ana Desk')
        ->assertJsonPath('data.waiting_minutes', 0)
        ->assertJsonPath('data.patient.name', 'Dela Cruz, Maria');

    $visit = ServiceVisit::sole();
    expect($visit->arrived_at->toDateTimeString())->toBe('2026-10-14 08:00:00')
        ->and($visit->received_by)->toBe($this->desk->id);
});

it('runs a visit from arrival to completion and reports the three durations', function () {
    Sanctum::actingAs($this->desk);
    $id = $this->postJson("/api/patients/{$this->patient->id}/service-visits", ['his_transaction_id' => 555])->json('data.id');

    Carbon::setTestNow('2026-10-14 08:25:00');
    Sanctum::actingAs($this->worker);
    $this->postJson("/api/service-visits/{$id}/start")
        ->assertOk()
        ->assertJsonPath('data.status', 'in_progress')
        ->assertJsonPath('data.served_by.name', 'Mitchelle O. Sanico, RSW')
        ->assertJsonPath('data.waiting_minutes', 25)
        ->assertJsonPath('data.processing_minutes', 0);

    Carbon::setTestNow('2026-10-14 09:10:00');
    $this->postJson("/api/service-visits/{$id}/complete", ['remarks' => 'Slip released'])
        ->assertOk()
        ->assertJsonPath('data.status', 'completed')
        ->assertJsonPath('data.remarks', 'Slip released')
        ->assertJsonPath('data.completed_by.id', $this->worker->id)
        ->assertJsonPath('data.waiting_minutes', 25)
        ->assertJsonPath('data.processing_minutes', 45)
        ->assertJsonPath('data.total_minutes', 70);

    // Durations are frozen once completed.
    Carbon::setTestNow('2026-10-14 15:00:00');
    expect(ServiceVisit::find($id)->totalMinutes())->toBe(70);
});

it('counts an open stage up to now', function () {
    $visit = queueVisit($this->patient, $this->desk);

    Carbon::setTestNow('2026-10-14 08:40:00');

    expect($visit->waitingMinutes())->toBe(40)
        ->and($visit->processingMinutes())->toBeNull()
        ->and($visit->totalMinutes())->toBe(40);
});

it('keeps one open visit per encounter', function () {
    queueVisit($this->patient, $this->desk, ['status' => ServiceVisit::STATUS_IN_PROGRESS, 'started_at' => now()]);
    Sanctum::actingAs($this->desk);

    $this->postJson("/api/patients/{$this->patient->id}/service-visits", ['his_transaction_id' => 555])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('his_transaction_id');

    // Another encounter of the same patient is fine.
    $this->postJson("/api/patients/{$this->patient->id}/service-visits", ['his_transaction_id' => 556])
        ->assertCreated();
});

it('allows a new visit once the encounter\'s last one is closed', function () {
    queueVisit($this->patient, $this->desk, ['status' => ServiceVisit::STATUS_COMPLETED, 'started_at' => now(), 'completed_at' => now()]);
    queueVisit($this->patient, $this->desk, ['status' => ServiceVisit::STATUS_CANCELLED, 'cancelled_at' => now()]);
    Sanctum::actingAs($this->desk);

    $this->postJson("/api/patients/{$this->patient->id}/service-visits", ['his_transaction_id' => 555])
        ->assertCreated();
});

it('refuses an illegal transition', function (string $status, string $action) {
    $visit = queueVisit($this->patient, $this->desk, ['status' => $status]);
    Sanctum::actingAs($this->worker);

    $this->postJson("/api/service-visits/{$visit->id}/{$action}", ['cancel_reason' => 'x'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('status');

    expect($visit->fresh()->status)->toBe($status);
})->with([
    'complete a waiting visit' => ['waiting', 'complete'],
    'start a visit in progress' => ['in_progress', 'start'],
    'start a completed visit' => ['completed', 'start'],
    'cancel a completed visit' => ['completed', 'cancel'],
    'start a cancelled visit' => ['cancelled', 'start'],
]);

it('cancels an open visit with a reason and drops its turnaround', function () {
    $visit = queueVisit($this->patient, $this->desk);
    Sanctum::actingAs($this->worker);

    $this->postJson("/api/service-visits/{$visit->id}/cancel")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('cancel_reason');

    $this->postJson("/api/service-visits/{$visit->id}/cancel", ['cancel_reason' => 'Watcher left'])
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled')
        ->assertJsonPath('data.cancel_reason', 'Watcher left')
        ->assertJsonPath('data.cancelled_by.id', $this->worker->id)
        ->assertJsonPath('data.waiting_minutes', null)
        ->assertJsonPath('data.total_minutes', null);
});

it('validates the time-in body', function () {
    Sanctum::actingAs($this->desk);

    $this->postJson("/api/patients/{$this->patient->id}/service-visits", ['his_transaction_id' => 0, 'purpose' => str_repeat('x', 121)])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['his_transaction_id', 'purpose']);
});

// ── Reads ────────────────────────────────────────────────────────────────────

it('lists the queue: open visits from any day, and the day\'s completions', function () {
    $juan = queuePatient('Juan', 'Santos');
    $old = queueVisit($juan, $this->desk, ['arrived_at' => now()->subDay(), 'his_transaction_id' => 1]);
    $waiting = queueVisit($this->patient, $this->desk);
    $serving = queueVisit($juan, $this->desk, ['his_transaction_id' => 2, 'status' => ServiceVisit::STATUS_IN_PROGRESS, 'started_at' => now(), 'served_by' => $this->worker->id]);
    $doneToday = queueVisit($juan, $this->desk, ['his_transaction_id' => 3, 'status' => ServiceVisit::STATUS_COMPLETED, 'started_at' => now(), 'completed_at' => now()]);
    queueVisit($juan, $this->desk, ['his_transaction_id' => 4, 'status' => ServiceVisit::STATUS_COMPLETED, 'arrived_at' => now()->subDay(), 'started_at' => now()->subDay(), 'completed_at' => now()->subDay()]);
    queueVisit($juan, $this->desk, ['his_transaction_id' => 5, 'status' => ServiceVisit::STATUS_CANCELLED, 'cancelled_at' => now()]);

    Sanctum::actingAs($this->worker);

    $this->getJson('/api/service-visits/queue')
        ->assertOk()
        ->assertJsonPath('date', '2026-10-14')
        ->assertJsonPath('waiting.*.id', [$old->id, $waiting->id])
        ->assertJsonPath('in_progress.*.id', [$serving->id])
        ->assertJsonPath('completed.*.id', [$doneToday->id])
        ->assertJsonPath('summary', ['waiting' => 2, 'in_progress' => 1, 'completed' => 1]);

    $this->getJson('/api/service-visits/queue?date=2026-10-13')
        ->assertOk()
        ->assertJsonCount(1, 'completed');
});

it('lists a patient\'s visits, newest first, optionally for one encounter', function () {
    $first = queueVisit($this->patient, $this->desk, ['status' => ServiceVisit::STATUS_COMPLETED, 'arrived_at' => now()->subDays(2), 'started_at' => now()->subDays(2), 'completed_at' => now()->subDays(2)]);
    $other = queueVisit($this->patient, $this->desk, ['his_transaction_id' => 999, 'arrived_at' => now()->subDay()]);
    $latest = queueVisit($this->patient, $this->desk);
    queueVisit(queuePatient('Juan', 'Santos'), $this->desk);

    Sanctum::actingAs($this->worker);

    $this->getJson("/api/patients/{$this->patient->id}/service-visits")
        ->assertOk()
        ->assertJsonPath('data.*.id', [$latest->id, $other->id, $first->id]);

    $this->getJson("/api/patients/{$this->patient->id}/service-visits?his_transaction_id=555")
        ->assertOk()
        ->assertJsonPath('data.*.id', [$latest->id, $first->id]);
});

// ── Access & audit ───────────────────────────────────────────────────────────

it('forbids every route without queue.manage', function (string $method, string $uri) {
    $visit = queueVisit($this->patient, $this->desk);
    Sanctum::actingAs(User::factory()->create());

    $uri = str_replace(['{patient}', '{visit}'], [$this->patient->id, $visit->id], $uri);

    $this->json($method, $uri, ['his_transaction_id' => 1, 'cancel_reason' => 'x'])->assertForbidden();
})->with([
    ['GET', '/api/service-visits/queue'],
    ['GET', '/api/patients/{patient}/service-visits'],
    ['POST', '/api/patients/{patient}/service-visits'],
    ['POST', '/api/service-visits/{visit}/start'],
    ['POST', '/api/service-visits/{visit}/complete'],
    ['POST', '/api/service-visits/{visit}/cancel'],
]);

it('rejects guests', function () {
    $this->getJson('/api/service-visits/queue')->assertUnauthorized();
});

it('writes the audit trail against the patient', function () {
    Sanctum::actingAs($this->desk);

    $this->postJson("/api/patients/{$this->patient->id}/service-visits", ['his_transaction_id' => 555])->assertCreated();

    $visit = ServiceVisit::sole();
    $row = Activity::query()->forSubjectKey($visit->getMorphClass(), $visit->id)->sole();

    expect($row->patient_id)->toBe($this->patient->id)
        ->and($row->event)->toBe('created');
});
