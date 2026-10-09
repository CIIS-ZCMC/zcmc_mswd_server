<?php

use App\Models\Activity;
use App\Models\DarEntry;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use App\Services\DarReportService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->worker = darWorker('Case Manager', [
        'employee_name' => 'Mitchelle O. Sanico, RSW', 'license_no' => '0016804', 'position' => 'Social Welfare Officer II',
    ]);
    $this->other = darWorker('Processor');
    $this->patient = darPatient('Maria', 'Dela Cruz', ['birthdate' => '1980-02-02', 'hospital_id' => 1702854]);
});

function darWorker(string $role, array $attributes = []): User
{
    $user = User::factory()->create(['role' => $role, ...$attributes]);
    $user->assignRole($role);

    return $user;
}

function darPatient(string $first, string $last, array $attributes = []): Patient
{
    return Patient::create([
        'sector_id' => Sector::firstOrCreate(['code' => 'MED'], ['name' => 'Medical'])->id,
        'first_name' => $first, 'last_name' => $last, 'sex' => 'female',
        'permanent_address' => 'San Jose Cawa-Cawa, Zamboanga City',
        ...$attributes,
    ]);
}

function darEntry(User $user, Patient $patient, array $attributes = []): DarEntry
{
    return DarEntry::create([
        'user_id' => $user->id, 'patient_id' => $patient->id,
        'entry_date' => today()->toDateString(), 'activity' => 'interview',
        ...$attributes,
    ]);
}

// ── Entries ──────────────────────────────────────────────────────────────────

it('adds a line to the caller\'s own DAR', function () {
    Sanctum::actingAs($this->worker);

    $this->postJson('/api/dar-entries', [
        'patient_id' => $this->patient->id, 'entry_date' => today()->toDateString(),
        'served_time' => '09:30', 'activity' => 'assessment', 'remarks' => 'Initial interview',
    ])
        ->assertCreated()
        ->assertJsonPath('data.activity_label', 'Assessment')
        ->assertJsonPath('data.served_time', '09:30')
        ->assertJsonPath('data.patient.name', 'Dela Cruz, Maria')
        ->assertJsonPath('data.patient.hospital_id', 1702854);

    expect(DarEntry::sole()->user_id)->toBe($this->worker->id);
});

it('ignores a user_id in the body', function () {
    Sanctum::actingAs($this->worker);

    $this->postJson('/api/dar-entries', [
        'patient_id' => $this->patient->id, 'entry_date' => today()->toDateString(),
        'activity' => 'interview', 'user_id' => $this->other->id,
    ])->assertCreated();

    expect(DarEntry::sole()->user_id)->toBe($this->worker->id);
});

it('lists one day of the caller\'s lines, in the order served, with totals', function () {
    $juan = darPatient('Juan', 'Santos');
    darEntry($this->worker, $this->patient, ['served_time' => '14:00', 'activity' => 'follow_up']);
    darEntry($this->worker, $juan, ['served_time' => '08:15']);
    darEntry($this->worker, $this->patient, ['activity' => 'documentation']); // untimed: last
    darEntry($this->worker, $juan, ['entry_date' => today()->subDay()->toDateString()]); // another day
    darEntry($this->other, $juan); // another worker

    Sanctum::actingAs($this->worker);

    $response = $this->getJson('/api/dar?date='.today()->toDateString())
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('summary.patients_served', 2)
        ->assertJsonPath('summary.entries', 3)
        ->assertJsonPath('activities.home_ward_visit', 'Home/Ward Visit');

    expect(collect($response->json('data'))->pluck('activity')->all())
        ->toBe(['interview', 'follow_up', 'documentation']);
});

it('defaults to today', function () {
    darEntry($this->worker, $this->patient);
    Sanctum::actingAs($this->worker);

    $this->getJson('/api/dar')
        ->assertOk()
        ->assertJsonPath('date', today()->toDateString())
        ->assertJsonCount(1, 'data');
});

it('edits and deletes the caller\'s own line', function () {
    $entry = darEntry($this->worker, $this->patient);
    Sanctum::actingAs($this->worker);

    $this->patchJson("/api/dar-entries/{$entry->id}", ['activity' => 'referral', 'remarks' => 'To DSWD'])
        ->assertOk()
        ->assertJsonPath('data.activity', 'referral')
        ->assertJsonPath('data.remarks', 'To DSWD');

    $this->deleteJson("/api/dar-entries/{$entry->id}")->assertNoContent();

    expect(DarEntry::count())->toBe(0)
        ->and(DarEntry::withTrashed()->count())->toBe(1);
});

it('forbids editing or deleting another worker\'s line', function () {
    $entry = darEntry($this->other, $this->patient);
    Sanctum::actingAs($this->worker);

    $this->patchJson("/api/dar-entries/{$entry->id}", ['remarks' => 'x'])->assertForbidden();
    $this->deleteJson("/api/dar-entries/{$entry->id}")->assertForbidden();

    expect($entry->fresh()->remarks)->toBeNull();
});

it('records the line on the patient\'s audit trail', function () {
    $entry = darEntry($this->worker, $this->patient);

    $row = Activity::query()->forSubjectKey($entry->getMorphClass(), $entry->id)->sole();

    expect($row->patient_id)->toBe($this->patient->id)
        ->and($row->event)->toBe('created');
});

// ── Validation ───────────────────────────────────────────────────────────────

it('rejects an invalid line', function (Closure $body, string $field) {
    Sanctum::actingAs($this->worker);

    $this->postJson('/api/dar-entries', [
        'patient_id' => $this->patient->id, 'entry_date' => today()->toDateString(), 'activity' => 'interview',
        ...$body(),
    ])->assertJsonValidationErrors($field);
})->with([
    'a future date' => [fn () => ['entry_date' => today()->addDay()->toDateString()], 'entry_date'],
    'an unknown activity' => [fn () => ['activity' => 'lunch'], 'activity'],
    'no patient' => [fn () => ['patient_id' => null], 'patient_id'],
    'a patient not in the registry' => [fn () => ['patient_id' => 999999], 'patient_id'],
    'a deleted patient' => [fn () => ['patient_id' => tap(darPatient('Old', 'Record'))->delete()->id], 'patient_id'],
    'a malformed time' => [fn () => ['served_time' => '9.30am'], 'served_time'],
    'over-long remarks' => [fn () => ['remarks' => str_repeat('x', 501)], 'remarks'],
]);

// ── Permissions ──────────────────────────────────────────────────────────────

it('forbids every DAR route without dar.manage', function (string $method, string $uri) {
    $entry = darEntry($this->worker, $this->patient);
    Sanctum::actingAs(User::factory()->create());

    $this->json($method, str_replace('{entry}', (string) $entry->id, $uri))->assertForbidden();
})->with([
    ['GET', '/api/dar'],
    ['GET', '/api/dar/export'],
    ['POST', '/api/dar-entries'],
    ['PATCH', '/api/dar-entries/{entry}'],
    ['DELETE', '/api/dar-entries/{entry}'],
]);

it('requires sign-in', function () {
    $this->getJson('/api/dar')->assertUnauthorized();
});

// ── Export ───────────────────────────────────────────────────────────────────

it('streams the day as a PDF, or downloads it', function () {
    darEntry($this->worker, $this->patient);
    Sanctum::actingAs($this->worker);

    $response = $this->get('/api/dar/export?date='.today()->toDateString())
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');

    expect(substr($response->getContent(), 0, 4))->toBe('%PDF');

    $this->get('/api/dar/export?download=1')
        ->assertOk()
        ->assertHeader('content-disposition', 'attachment; filename=DAR_mitchelle-o-sanico-rsw_'.today()->toDateString().'.pdf');
});

it('prints the lines, the activity totals and the Prepared-by block', function () {
    darEntry($this->worker, $this->patient, ['served_time' => '09:30', 'remarks' => 'Referred to billing']);
    darEntry($this->worker, $this->patient, ['activity' => 'guarantee_assistance']);
    darEntry($this->other, darPatient('Pedro', 'Hidden'));

    $html = app(DarReportService::class)->renderPdf($this->worker, today())->getDomPDF()->outputHtml();

    expect($html)
        ->toContain('Daily Accomplishment Report')
        ->toContain('Dela Cruz, Maria')
        ->toContain('1702854')
        ->toContain('9:30 AM')
        ->toContain('Referred to billing')
        ->toContain('Guarantee / Assistance')
        ->toContain('Prepared by:')
        ->toContain('Mitchelle O. Sanico, RSW')
        ->toContain('Social Welfare Officer II')
        ->toContain('License No. 0016804')
        ->not->toContain('Hidden');
});

it('prints an empty day', function () {
    $html = app(DarReportService::class)->renderPdf($this->worker, today())->getDomPDF()->outputHtml();

    expect($html)->toContain('No patients recorded for this day.');
});

it('exports the day as a CSV', function () {
    darEntry($this->worker, $this->patient, ['served_time' => '09:30']);
    darEntry($this->worker, $this->patient, ['activity' => 'referral']);
    darEntry($this->other, $this->patient);
    Sanctum::actingAs($this->worker);

    $response = $this->get('/api/dar/export?format=csv')->assertOk();
    $lines = array_values(array_filter(explode("\n", $response->streamedContent())));

    expect($lines)->toHaveCount(3)
        ->and($lines[0])->toStartWith('#,Date,Time,Patient')
        ->and($lines[1])->toContain('"Dela Cruz, Maria"')->toContain('Interview')
        ->and($lines[2])->toContain('Referral');
});

it('rejects an unknown export format', function () {
    Sanctum::actingAs($this->worker);

    $this->getJson('/api/dar/export?format=xlsx')->assertJsonValidationErrors('format');
});

// ── Web Page ─────────────────────────────────────────────────────────────────

it('renders the DAR Inertia page with today prop', function () {
    $this->actingAs($this->worker)
        ->get('/dar')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Dar/Index')
            ->has('today')
            ->where('today', today()->toDateString())
        );
});

it('forbids the DAR web page without dar.manage', function () {
    $userWithoutRole = User::factory()->create();

    $this->actingAs($userWithoutRole)
        ->get('/dar')
        ->assertForbidden();
});

it('redirects unauthenticated guest accessing /dar', function () {
    $this->get('/dar')
        ->assertRedirect('/login');
});
