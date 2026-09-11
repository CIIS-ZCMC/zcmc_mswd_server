<?php

use App\Models\Assessment;
use App\Models\AssistantType;
use App\Models\CaseModel;
use App\Models\Intervention;
use App\Models\InterventionType;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->worker = User::factory()->create(['employee_name' => 'Rosa Santos', 'role' => 'Case Manager']);
    $this->worker->assignRole('Case Manager');
});

function reportUser(string $role): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function reportCase(User $owner, int $sectorId, array $overrides = []): CaseModel
{
    $patient = Patient::create([
        'sector_id' => $sectorId, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);

    return CaseModel::create(array_merge([
        'patient_id' => $patient->id,
        'assigned_user_id' => $owner->id,
        'case_code' => 'CASE-'.uniqid(),
        'case_type' => 'medical',
        'priority_level' => 'high',
        'status' => CaseModel::STATUS_OPEN,
        'admission_type' => 'OPD',
        'date_opened' => now(),
    ], $overrides));
}

function reportScsr(CaseModel $case, User $author, array $overrides = []): Assessment
{
    $scsr = Assessment::create(array_merge([
        'case_id' => $case->id,
        'created_by' => $author->id,
        'classification' => 'indigent',
        'social_case_status' => Assessment::SOCIAL_CASE_DRAFT,
        'social_case_no' => 'SCSR-'.uniqid(),
    ], $overrides));

    // created_at drives the date range, and Eloquent stamps it on insert.
    if (isset($overrides['created_at'])) {
        $scsr->forceFill(['created_at' => $overrides['created_at']])->saveQuietly();
    }

    return $scsr->refresh();
}

it('aggregates counts matching hand-built fixtures', function () {
    reportScsr(reportCase($this->worker, $this->sector->id), $this->worker);
    reportScsr(reportCase($this->worker, $this->sector->id), $this->worker, [
        'social_case_status' => Assessment::SOCIAL_CASE_FOR_REVIEW,
    ]);
    reportScsr(reportCase($this->worker, $this->sector->id, ['case_type' => 'financial', 'admission_type' => 'ER']), $this->worker, [
        'social_case_status' => Assessment::SOCIAL_CASE_FINALIZED,
        'classification' => 'low_income',
        'noted_at' => now(),
    ]);
    // A case with no report at all — the gap the queue exists to close.
    reportCase($this->worker, $this->sector->id);

    Sanctum::actingAs(reportUser('MSS Head'));
    $data = $this->getJson('/api/reports/social-cases')->assertOk()->json('data');

    // toEqual, not toBe: GROUP BY fixes no key order and none is promised.
    expect($data['total'])->toBe(3)
        ->and($data['by_social_case_status'])->toEqual(['draft' => 1, 'finalized' => 1, 'for_review' => 1])
        ->and($data['by_classification'])->toEqual(['indigent' => 2, 'low_income' => 1])
        ->and($data['by_case_type'])->toEqual(['medical' => 2, 'financial' => 1])
        ->and($data['by_admission_type'])->toEqual(['OPD' => 2, 'ER' => 1])
        ->and($data['by_assigned_user'])->toEqual(['Rosa Santos' => 3])
        ->and($data['cases_without_social_case'])->toBe(1);
});

it('honours the date range', function () {
    reportScsr(reportCase($this->worker, $this->sector->id), $this->worker);
    reportScsr(reportCase($this->worker, $this->sector->id), $this->worker, [
        'created_at' => now()->subMonths(6),
    ]);

    Sanctum::actingAs(reportUser('MSS Head'));

    expect($this->getJson('/api/reports/social-cases')->assertOk()->json('data.total'))->toBe(1);

    $wide = $this->getJson('/api/reports/social-cases?from='.now()->subYear()->toDateString().'&to='.now()->toDateString())
        ->assertOk()->json('data');

    expect($wide['total'])->toBe(2)
        ->and($wide['from'])->toBe(now()->subYear()->toDateString());
});

it('reports the median days from start to finalize', function () {
    // Spans of 2, 4 and 10 days — the median is 4, where an average would be 5.3.
    foreach ([2, 4, 10] as $days) {
        $case = reportCase($this->worker, $this->sector->id);
        reportScsr($case, $this->worker, [
            'social_case_status' => Assessment::SOCIAL_CASE_FINALIZED,
            'noted_at' => now()->addDays($days),
        ]);
    }

    Sanctum::actingAs(reportUser('MSS Head'));

    // JSON renders a whole float as 4, so compare loosely.
    expect($this->getJson('/api/reports/social-cases')->assertOk()->json('data.median_days_to_finalize'))
        ->toEqual(4.0);
});

it('reports no median when nothing has been finalized', function () {
    reportScsr(reportCase($this->worker, $this->sector->id), $this->worker);

    Sanctum::actingAs(reportUser('MSS Head'));

    expect($this->getJson('/api/reports/social-cases')->assertOk()->json('data.median_days_to_finalize'))
        ->toBeNull();
});

it('counts overdue follow-ups', function () {
    $case = reportCase($this->worker, $this->sector->id);

    Sanctum::actingAs($this->worker);
    $this->postJson("/api/cases/{$case->id}/progress-notes", [
        'narrative' => 'Overdue.', 'follow_up_on' => now()->subWeek()->toDateString(),
    ])->assertCreated();
    $this->postJson("/api/cases/{$case->id}/progress-notes", [
        'narrative' => 'Not yet due.', 'follow_up_on' => now()->addWeek()->toDateString(),
    ])->assertCreated();

    Sanctum::actingAs(reportUser('MSS Head'));

    expect($this->getJson('/api/reports/social-cases')->assertOk()->json('data.overdue_follow_ups'))->toBe(1);
});

// --------------------------------------------------------- protective cases

it('excludes protective cases for a user without audit.view_protective', function () {
    reportScsr(reportCase($this->worker, $this->sector->id), $this->worker);
    reportScsr(reportCase($this->worker, $this->sector->id, ['is_protective' => true]), $this->worker);

    // Supervisor holds reports.view but not audit.view_protective.
    Sanctum::actingAs(reportUser('Supervisor'));
    $filtered = $this->getJson('/api/reports/social-cases')->assertOk()->json('data');

    expect($filtered['total'])->toBe(1)
        // The marker is the point: a filtered total must never read as a complete one.
        ->and($filtered['protective_excluded'])->toBeTrue();
});

it('includes protective cases for a user who holds audit.view_protective', function () {
    reportScsr(reportCase($this->worker, $this->sector->id), $this->worker);
    reportScsr(reportCase($this->worker, $this->sector->id, ['is_protective' => true]), $this->worker);

    Sanctum::actingAs(reportUser('MSS Head'));
    $full = $this->getJson('/api/reports/social-cases')->assertOk()->json('data');

    expect($full['total'])->toBe(2)
        ->and($full['protective_excluded'])->toBeFalse();
});

// ---------------------------------------------------------------- the gate

it('lets reports.view read the dashboard but not the export', function () {
    Sanctum::actingAs($this->worker); // Case Manager: reports.view, no reports.generate

    $this->getJson('/api/reports/social-cases')->assertOk();
    $this->get('/api/reports/social-cases/export')->assertForbidden();
});

it('lets a supervisor take the export', function () {
    Sanctum::actingAs(reportUser('Supervisor'));

    $this->get('/api/reports/social-cases/export')->assertOk();
});

it('forbids the dashboard without reports.view', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->getJson('/api/reports/social-cases')->assertForbidden();
});

// ----------------------------------------------------------------- exports

it('emits a csv with the expected header row', function () {
    reportScsr(reportCase($this->worker, $this->sector->id), $this->worker);

    Sanctum::actingAs(reportUser('MSS Head'));
    $response = $this->get('/api/reports/social-cases/export')->assertOk();

    $csv = $response->streamedContent();
    $lines = array_values(array_filter(explode("\n", str_replace("\r", '', $csv))));

    expect($lines[0])->toBe('group,label,value')
        ->and($csv)->toContain('social_case_status,draft,1')
        ->and($csv)->toContain('total,social_case_studies,1');
});

it('emits the export as a pdf on request', function () {
    reportScsr(reportCase($this->worker, $this->sector->id), $this->worker);

    Sanctum::actingAs(reportUser('MSS Head'));
    $response = $this->get('/api/reports/social-cases/export?format=pdf')->assertOk();

    expect(substr($response->getContent(), 0, 4))->toBe('%PDF');
});

// ------------------------------------------------------- case summary pdf

it('renders a case summary carrying the report, interventions and notes', function () {
    $case = reportCase($this->worker, $this->sector->id);
    reportScsr($case, $this->worker, [
        'presenting_problem' => 'Cannot afford maintenance medicine',
        'assessment_notes' => 'Household income below the poverty threshold',
        'recommendation' => 'Full medicine subsidy',
        'recommended_amount' => 2500,
    ]);

    Intervention::create([
        'case_id' => $case->id, 'created_by' => $this->worker->id,
        'intervention_type_id' => InterventionType::firstOrCreate(['name' => 'Counselling'])->id,
        'description' => 'Session held', 'date_given' => now(), 'outcome' => 'Client reassured',
    ]);

    AssistantType::firstOrCreate(['name' => 'Medicine'], ['code' => 'MED', 'category' => 'medical', 'is_active' => true]);

    Sanctum::actingAs($this->worker);
    $this->postJson("/api/cases/{$case->id}/progress-notes", [
        'narrative' => 'Phoned the daughter, still no funds.',
    ])->assertCreated();

    $html = view('pdf.case-summary', ['case' => $case->fresh([
        'patient.sector', 'assignedUser', 'watchers', 'socialCase.preparedBy', 'socialCase.notedBy',
        'interventions.interventionType', 'patientAssistances.assistantType', 'progressNotes.author',
    ])])->render();

    expect($html)
        ->toContain('Case Summary')
        ->toContain($case->case_code)
        ->toContain('Cannot afford maintenance medicine')
        ->toContain('Counselling')
        ->toContain('Client reassured')
        ->toContain('Phoned the daughter')
        ->toContain('₱ 2,500.00');
});

it('renders a case summary for a case with no report', function () {
    $case = reportCase($this->worker, $this->sector->id);

    $html = view('pdf.case-summary', ['case' => $case->fresh([
        'patient.sector', 'assignedUser', 'watchers', 'socialCase',
        'interventions', 'patientAssistances', 'progressNotes',
    ])])->render();

    expect($html)->toContain('No social case study has been started');
});

it('streams the case summary pdf and offers it as a download', function () {
    $case = reportCase($this->worker, $this->sector->id);
    reportScsr($case, $this->worker);

    Sanctum::actingAs($this->worker); // cases.view is enough: this is a case document

    $response = $this->get("/api/cases/{$case->id}/summary-pdf")->assertOk();
    expect(substr($response->getContent(), 0, 4))->toBe('%PDF');

    $this->get("/api/cases/{$case->id}/summary-pdf?download=1")
        ->assertOk()
        ->assertHeader('content-disposition', "attachment; filename={$case->case_code}-summary.pdf");
});

it('requires cases.view for the case summary', function () {
    $case = reportCase($this->worker, $this->sector->id);

    Sanctum::actingAs(User::factory()->create());
    $this->get("/api/cases/{$case->id}/summary-pdf")->assertForbidden();
});
