<?php

use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\ServiceVisit;
use App\Models\TurnaroundTarget;
use App\Models\User;
use App\Services\TurnaroundReportService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

// The migration seeds the targets: waiting 30, processing 60, total 90 minutes.
beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    Carbon::setTestNow('2026-10-15 12:00:00');

    $this->ana = tatReportUser('Case Manager', ['employee_name' => 'Ana Reyes']);
    $this->ben = tatReportUser('Processor', ['employee_name' => 'Ben Cruz']);
    $this->head = tatReportUser('Admin');
    $this->patient = tatReportPatient();
});

afterEach(fn () => Carbon::setTestNow());

function tatReportUser(string $role, array $attributes = []): User
{
    $user = User::factory()->create(['role' => $role, ...$attributes]);
    $user->assignRole($role);

    return $user;
}

function tatReportPatient(): Patient
{
    return Patient::create([
        'sector_id' => Sector::firstOrCreate(['code' => 'MED'], ['name' => 'Medical'])->id,
        'first_name' => 'Maria', 'last_name' => 'Dela Cruz', 'sex' => 'female',
    ]);
}

/** A completed visit: arrived, started and completed at the given stamps. */
function tatVisit(Patient $patient, User $servedBy, string $arrived, string $started, string $completed): ServiceVisit
{
    return ServiceVisit::create([
        'patient_id' => $patient->id, 'his_transaction_id' => random_int(1, 999_999),
        'status' => ServiceVisit::STATUS_COMPLETED,
        'arrived_at' => $arrived, 'started_at' => $started, 'completed_at' => $completed,
        'received_by' => $servedBy->id, 'served_by' => $servedBy->id, 'completed_by' => $servedBy->id,
    ]);
}

/**
 * Four visits over two days:
 *   Ana 10-14  wait 10, process 30, total 40
 *   Ana 10-14  wait 40, process 60, total 100
 *   Ben 10-14  wait 20, process 40, total 60
 *   Ben 10-13  wait 5,  process 30, total 35
 * plus one cancelled, one still waiting and one completed outside the range.
 */
function tatFixtures(Patient $patient, User $ana, User $ben): void
{
    tatVisit($patient, $ana, '2026-10-14 08:00', '2026-10-14 08:10', '2026-10-14 08:40');
    tatVisit($patient, $ana, '2026-10-14 09:00', '2026-10-14 09:40', '2026-10-14 10:40');
    tatVisit($patient, $ben, '2026-10-14 08:00', '2026-10-14 08:20', '2026-10-14 09:00');
    tatVisit($patient, $ben, '2026-10-13 08:00', '2026-10-13 08:05', '2026-10-13 08:35');
    tatVisit($patient, $ben, '2026-09-01 08:00', '2026-09-01 08:05', '2026-09-01 08:35');

    ServiceVisit::create([
        'patient_id' => $patient->id, 'his_transaction_id' => 1, 'status' => ServiceVisit::STATUS_CANCELLED,
        'arrived_at' => '2026-10-14 13:00', 'cancelled_at' => '2026-10-14 13:30', 'cancel_reason' => 'Left',
        'received_by' => $ana->id, 'cancelled_by' => $ana->id,
    ]);
    ServiceVisit::create([
        'patient_id' => $patient->id, 'his_transaction_id' => 2, 'status' => ServiceVisit::STATUS_WAITING,
        'arrived_at' => '2026-10-14 15:00', 'received_by' => $ana->id,
    ]);
}

// ── Figures ──────────────────────────────────────────────────────────────────

it('reports each stage with average, median, p90, max and compliance', function () {
    tatFixtures($this->patient, $this->ana, $this->ben);
    Sanctum::actingAs($this->head);

    $data = $this->getJson('/api/reports/turnaround?from=2026-10-13&to=2026-10-14')->assertOk()->json('data');

    expect($data['from'])->toBe('2026-10-13')
        ->and($data['to'])->toBe('2026-10-14')
        ->and($data['completed'])->toBe(4)
        ->and($data['cancelled'])->toBe(1)
        ->and($data['targets'])->toBe(['waiting' => 30, 'processing' => 60, 'total' => 90])
        ->and($data['stages']['waiting'])->toEqual(['count' => 4, 'avg' => 18.8, 'median' => 15, 'p90' => 40, 'max' => 40, 'within_target_pct' => 75])
        ->and($data['stages']['processing'])->toEqual(['count' => 4, 'avg' => 40, 'median' => 35, 'p90' => 60, 'max' => 60, 'within_target_pct' => 100])
        ->and($data['stages']['total'])->toEqual(['count' => 4, 'avg' => 58.8, 'median' => 50, 'p90' => 100, 'max' => 100, 'within_target_pct' => 75]);
});

it('breaks total turnaround down by serving worker, sorted by name', function () {
    tatFixtures($this->patient, $this->ana, $this->ben);
    Sanctum::actingAs($this->head);

    $rows = $this->getJson('/api/reports/turnaround?from=2026-10-13&to=2026-10-14')->json('data.by_employee');

    expect($rows)->toEqual([
        ['user_id' => $this->ana->id, 'name' => 'Ana Reyes', 'count' => 2, 'avg' => 70, 'median' => 70, 'p90' => 100, 'max' => 100, 'within_target_pct' => 50],
        ['user_id' => $this->ben->id, 'name' => 'Ben Cruz', 'count' => 2, 'avg' => 47.5, 'median' => 47.5, 'p90' => 60, 'max' => 60, 'within_target_pct' => 100],
    ]);
});

it('breaks total turnaround down by completion day', function () {
    tatFixtures($this->patient, $this->ana, $this->ben);
    Sanctum::actingAs($this->head);

    $rows = $this->getJson('/api/reports/turnaround?from=2026-10-13&to=2026-10-14')->json('data.by_day');

    expect($rows)->toEqual([
        ['date' => '2026-10-13', 'count' => 1, 'avg' => 35, 'median' => 35, 'p90' => 35, 'max' => 35, 'within_target_pct' => 100],
        ['date' => '2026-10-14', 'count' => 3, 'avg' => 66.7, 'median' => 60, 'p90' => 100, 'max' => 100, 'within_target_pct' => 66.7],
    ]);
});

it('defaults to the month before today and swaps a reversed range', function () {
    tatFixtures($this->patient, $this->ana, $this->ben);
    Sanctum::actingAs($this->head);

    $this->getJson('/api/reports/turnaround')
        ->assertOk()
        ->assertJsonPath('data.from', '2026-09-15')
        ->assertJsonPath('data.to', '2026-10-15')
        ->assertJsonPath('data.completed', 4);

    $this->getJson('/api/reports/turnaround?from=2026-10-14&to=2026-09-01')
        ->assertOk()
        ->assertJsonPath('data.from', '2026-09-01')
        ->assertJsonPath('data.completed', 5);
});

it('reports empty figures when nothing was completed', function () {
    Sanctum::actingAs($this->head);

    $data = $this->getJson('/api/reports/turnaround')->assertOk()->json('data');

    expect($data['completed'])->toBe(0)
        ->and($data['stages']['total'])->toBe(['count' => 0, 'avg' => null, 'median' => null, 'p90' => null, 'max' => null, 'within_target_pct' => null])
        ->and($data['by_employee'])->toBe([])
        ->and($data['by_day'])->toBe([]);
});

it('leaves compliance out for an inactive target', function () {
    tatFixtures($this->patient, $this->ana, $this->ben);
    TurnaroundTarget::where('stage', TurnaroundTarget::STAGE_WAITING)->update(['is_active' => false]);
    Sanctum::actingAs($this->head);

    $data = $this->getJson('/api/reports/turnaround?from=2026-10-13&to=2026-10-14')->json('data');

    expect($data['targets']['waiting'])->toBeNull()
        ->and($data['stages']['waiting']['within_target_pct'])->toBeNull()
        ->and($data['stages']['waiting']['count'])->toBe(4)
        ->and($data['stages']['total']['within_target_pct'])->toEqual(75);
});

it('rejects a malformed date', function () {
    Sanctum::actingAs($this->head);

    $this->getJson('/api/reports/turnaround?from=14-10-2026')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('from');
});

// ── Protective cases ─────────────────────────────────────────────────────────

it('excludes visits of a patient with a protective case without audit.view_protective', function () {
    tatVisit($this->patient, $this->ana, '2026-10-14 08:00', '2026-10-14 08:10', '2026-10-14 08:40');
    $protected = tatReportPatient();
    tatVisit($protected, $this->ana, '2026-10-14 09:00', '2026-10-14 09:10', '2026-10-14 09:40');
    CaseModel::create([
        'patient_id' => $protected->id, 'assigned_user_id' => $this->ana->id, 'case_code' => 'CASE-P1',
        'case_type' => 'medical', 'priority_level' => 'high', 'status' => CaseModel::STATUS_OPEN,
        'admission_type' => 'OPD', 'date_opened' => now(), 'is_protective' => true,
    ]);

    // Supervisor holds reports.view but not audit.view_protective.
    Sanctum::actingAs(tatReportUser('Supervisor'));
    $this->getJson('/api/reports/turnaround')
        ->assertOk()
        ->assertJsonPath('data.completed', 1)
        ->assertJsonPath('data.protective_excluded', true);

    Sanctum::actingAs($this->head);
    $this->getJson('/api/reports/turnaround')
        ->assertOk()
        ->assertJsonPath('data.completed', 2)
        ->assertJsonPath('data.protective_excluded', false);
});

// ── Gates ────────────────────────────────────────────────────────────────────

it('lets reports.view read the dashboard but not the export', function () {
    $this->ana->givePermissionTo('reports.view');
    Sanctum::actingAs($this->ana); // reports.view, no reports.generate

    $this->getJson('/api/reports/turnaround')->assertOk();
    $this->get('/api/reports/turnaround/export')->assertForbidden();
});

it('forbids the dashboard without reports.view', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->getJson('/api/reports/turnaround')->assertForbidden();
});

it('rejects guests', function () {
    $this->getJson('/api/reports/turnaround')->assertUnauthorized();
});

// ── Exports ──────────────────────────────────────────────────────────────────

it('exports a csv with one row per stage, worker and day', function () {
    tatFixtures($this->patient, $this->ana, $this->ben);
    Sanctum::actingAs(tatReportUser('Supervisor'));

    $response = $this->get('/api/reports/turnaround/export?from=2026-10-13&to=2026-10-14')->assertOk();

    expect($response->headers->get('content-disposition'))->toContain('turnaround-time-2026-10-13-to-2026-10-14.csv');

    $lines = array_values(array_filter(explode("\n", str_replace("\r", '', $response->streamedContent()))));

    expect($lines[0])->toBe('group,label,count,avg_minutes,median_minutes,p90_minutes,max_minutes,within_target_pct')
        ->and($lines)->toContain('stage,total,4,58.8,50,100,100,75')
        ->and($lines)->toContain('employee,"Ana Reyes",2,70,70,100,100,50')
        ->and($lines)->toContain('day,2026-10-13,1,35,35,35,35,100')
        ->and($lines)->toContain('cancelled,visits,1,,,,,')
        ->and($lines)->toHaveCount(1 + 3 + 2 + 2 + 1);
});

it('exports the report as a pdf on request', function () {
    tatFixtures($this->patient, $this->ana, $this->ben);
    Sanctum::actingAs($this->head);

    $response = $this->get('/api/reports/turnaround/export?format=pdf&download=1')->assertOk();

    expect(substr($response->getContent(), 0, 4))->toBe('%PDF')
        ->and($response->headers->get('content-disposition'))->toContain('attachment');
});

it('renders the pdf with the stages, workers and days', function () {
    tatFixtures($this->patient, $this->ana, $this->ben);
    $service = app(TurnaroundReportService::class);

    $html = $service->renderPdf($service->summary($this->head, '2026-10-13', '2026-10-14'))->getDomPDF()->outputHtml();

    expect($html)->toContain('Turnaround Time Report')
        ->toContain('Total Turnaround Time')
        ->toContain('Ana Reyes')
        ->toContain('Ben Cruz')
        ->toContain('2026-10-13')
        ->toContain('75%');
});
