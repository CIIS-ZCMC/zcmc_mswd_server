<?php

use App\Models\Assessment;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\PatientFamilyMember;
use App\Models\Sector;
use App\Models\User;
use App\Support\UisExpenseSlots;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->worker = User::factory()->create(['role' => 'MSS Head']);
    $this->worker->assignRole('MSS Head');

    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
        'occupation' => 'Vendor', 'monthly_income' => 3000, 'educational_attainment' => 'High School',
    ]);

    Sanctum::actingAs($this->worker);
});

function seCase(Patient $patient, User $worker, string $code, array $overrides = []): CaseModel
{
    return CaseModel::create(array_merge([
        'patient_id' => $patient->id, 'assigned_user_id' => $worker->id,
        'case_code' => $code, 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'OPD', 'date_opened' => now(),
    ], $overrides));
}

/** An intake assessment whose stored net per-capita matches a household of $household people. */
function seAssessment(CaseModel $case, User $worker, float $income, float $expenses = 0, int $household = 1, array $overrides = []): Assessment
{
    return Assessment::create(array_merge([
        'case_id' => $case->id, 'created_by' => $worker->id, 'classification' => 'C2',
        'calculated_classification' => 'C2', 'total_family_income' => $income,
        'net_per_capita_income' => round(max(0, $income - $expenses) / $household, 2),
    ], $overrides));
}

function seUrl(Patient $patient): string
{
    return "/api/patients/{$patient->id}/socioeconomic";
}

it('returns the household, current profile, expenses and history of an assessed patient', function () {
    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Pedro', 'monthly_income' => 5000]);
    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Lita', 'monthly_income' => null]);

    $case = seCase($this->patient, $this->worker, 'CASE-SE-1');
    $assessment = seAssessment($case, $this->worker, 12000, 4400, 3, [
        'house_tenure' => 'rented', 'light_source' => ['electricity'], 'water_source' => ['public'],
        'housing_type' => 'Concrete', 'utilities_access' => 'Piped water', 'other_income_sources' => ['remittance'],
        'problem_categories' => ['health'], 'problem_specify' => 'Dialysis', 'presenting_problem' => 'Needs meds',
    ]);
    $assessment->expenses()->create(['expense_type' => 'Food', 'amount' => 3000]);
    $assessment->expenses()->create(['expense_type' => 'House help', 'amount' => 400]);
    $assessment->expenses()->create(['expense_type' => 'Pets', 'amount' => 1000]); // matches no slot

    $data = $this->getJson(seUrl($this->patient))->assertOk()->json('data');

    expect($data['patient'])->toMatchArray(['occupation' => 'Vendor', 'monthly_income' => 3000.0])
        ->and($data['household']['size'])->toBe(3)
        ->and($data['household']['members_count'])->toBe(2)
        ->and($data['household']['earners_count'])->toBe(2) // Pedro + the patient
        ->and($data['household']['members_income_total'])->toEqual(5000.0)
        ->and($data['household']['members'])->toHaveCount(2)
        ->and($data['current']['assessment_id'])->toBe($assessment->id)
        ->and($data['current']['case']['case_code'])->toBe('CASE-SE-1')
        ->and($data['current']['income']['total_family_income'])->toEqual(12000.0)
        ->and($data['current']['income']['other_income_sources'])->toBe(['remittance'])
        ->and($data['current']['living'])->toMatchArray([
            'house_tenure' => 'rented', 'light_source' => ['electricity'], 'water_source' => ['public'],
            'housing_type' => 'Concrete', 'utilities_access' => 'Piped water',
        ])
        ->and($data['current']['problems'])->toMatchArray(['categories' => ['health'], 'specify' => 'Dialysis', 'presenting' => 'Needs meds'])
        ->and($data['current']['classification']['final'])->toBe('C2')
        ->and($data['current']['classification']['stale'])->toBeFalse()
        ->and($data['current']['expenses']['lines'])->toHaveCount(3)
        ->and($data['current']['expenses']['total'])->toEqual(4400.0) // the unmatched line counts
        ->and($data['current']['expenses']['expense_to_income_ratio'])->toEqual(0.37)
        ->and($data['current']['expenses']['slots'])->toEqual(UisExpenseSlots::slots($assessment->expenses))
        ->and($data['current']['expenses']['slots']['house_help'])->toEqual(400.0)
        ->and($data['current']['expenses']['slots']['housing'])->toBeNull()
        ->and($data['history'])->toHaveCount(1)
        ->and($data['history'][0]['expenses_total'])->toEqual(4400.0);
});

it('has no current profile when the patient was never assessed', function () {
    seCase($this->patient, $this->worker, 'CASE-SE-NONE');

    $data = $this->getJson(seUrl($this->patient))->assertOk()->json('data');

    expect($data['current'])->toBeNull()
        ->and($data['history'])->toBe([])
        ->and($data['household']['size'])->toBe(1);
});

it('leaves the expense ratio null when there is no income', function () {
    $case = seCase($this->patient, $this->worker, 'CASE-SE-ZERO');
    $assessment = seAssessment($case, $this->worker, 0);
    $assessment->expenses()->create(['expense_type' => 'Food', 'amount' => 100]);

    $current = $this->getJson(seUrl($this->patient))->assertOk()->json('data.current');

    expect($current['expenses']['expense_to_income_ratio'])->toBeNull();
});

it('does not treat the social case study as an intake assessment', function () {
    $case = seCase($this->patient, $this->worker, 'CASE-SE-SCSR');
    seAssessment($case, $this->worker, 9000, 0, 1, ['social_case_status' => Assessment::SOCIAL_CASE_DRAFT]);

    $data = $this->getJson(seUrl($this->patient))->assertOk()->json('data');

    expect($data['current'])->toBeNull()->and($data['history'])->toBe([]);
});

it('lists the newest assessment as current and the history newest first, capped', function () {
    foreach (range(1, 12) as $i) {
        $case = seCase($this->patient, $this->worker, "CASE-SE-H{$i}");
        $assessment = seAssessment($case, $this->worker, 1000 * $i);
        $assessment->forceFill(['created_at' => now()->subDays(20 - $i)])->save();
    }

    $data = $this->getJson(seUrl($this->patient))->assertOk()->json('data');

    expect($data['history'])->toHaveCount(10)
        ->and($data['current']['case']['case_code'])->toBe('CASE-SE-H12')
        ->and($data['history'][0]['case_code'])->toBe('CASE-SE-H12')
        ->and($data['history'][9]['case_code'])->toBe('CASE-SE-H3')
        ->and($data['history'][0]['total_family_income'])->toEqual(12000.0);
});

it('shows both rows of a reassessment chain on one case', function () {
    $case = seCase($this->patient, $this->worker, 'CASE-SE-RE');
    $first = seAssessment($case, $this->worker, 4000);
    $first->forceFill(['created_at' => now()->subDays(3)])->save();
    $second = seAssessment($case, $this->worker, 8000, 0, 1, ['parent_assessment_id' => $first->id]);

    $data = $this->getJson(seUrl($this->patient))->assertOk()->json('data');

    expect($data['current']['assessment_id'])->toBe($second->id)
        ->and(collect($data['history'])->pluck('assessment_id')->all())->toBe([$second->id, $first->id]);
});

it('flags the classification stale after the household changes and clears it on reassessment', function () {
    $case = seCase($this->patient, $this->worker, 'CASE-SE-STALE');
    $assessment = seAssessment($case, $this->worker, 10000, 2000, 1); // classified for a household of one
    $assessment->expenses()->create(['expense_type' => 'Food', 'amount' => 2000]);

    expect($this->getJson(seUrl($this->patient))->json('data.current.classification.stale'))->toBeFalse();

    $this->postJson("/api/patients/{$this->patient->id}/family-members", ['name' => 'Pedro', 'relationship' => 'Spouse'])
        ->assertCreated();

    expect($this->getJson(seUrl($this->patient))->json('data.current.classification.stale'))->toBeTrue();

    $this->postJson("/api/cases/{$case->id}/reassess", [
        'reassessment_reason' => 'Household changed', 'total_family_income' => 10000,
    ])->assertSuccessful();

    $data = $this->getJson(seUrl($this->patient))->json('data');
    expect($data['current']['classification']['stale'])->toBeFalse()
        ->and($data['household']['size'])->toBe(2);
});

it('keeps the classification consistent when an expense is edited through the existing endpoint', function () {
    $case = seCase($this->patient, $this->worker, 'CASE-SE-EDIT');
    $assessment = seAssessment($case, $this->worker, 10000, 0, 1);

    $this->postJson("/api/assessments/{$assessment->id}/expenses", ['expense_type' => 'Food', 'amount' => 2500])
        ->assertCreated();

    $current = $this->getJson(seUrl($this->patient))->json('data.current');

    expect($current['expenses']['total'])->toEqual(2500.0)
        ->and($current['income']['net_per_capita_income'])->toEqual(7500.0)
        ->and($current['classification']['stale'])->toBeFalse();
});

it('never leaks another patient\'s assessments', function () {
    $other = Patient::create(['sector_id' => $this->sector->id, 'first_name' => 'Zed', 'last_name' => 'Cruz', 'sex' => 'male']);
    seAssessment(seCase($other, $this->worker, 'CASE-SE-OTHER'), $this->worker, 99999);
    seCase($this->patient, $this->worker, 'CASE-SE-MINE');

    $data = $this->getJson(seUrl($this->patient))->assertOk()->json('data');

    expect($data['current'])->toBeNull()->and($data['history'])->toBe([]);
});

it('does not query once per case', function () {
    foreach (range(1, 6) as $i) {
        $case = seCase($this->patient, $this->worker, "CASE-SE-Q{$i}");
        seAssessment($case, $this->worker, 1000)->expenses()->create(['expense_type' => 'Food', 'amount' => 1]);
    }

    $this->getJson(seUrl($this->patient))->assertOk(); // warm the permission cache

    DB::enableQueryLog();
    $this->getJson(seUrl($this->patient))->assertOk()->assertJsonCount(6, 'data.history');
    $queries = count(DB::getQueryLog());

    foreach (range(7, 12) as $i) {
        $case = seCase($this->patient, $this->worker, "CASE-SE-Q{$i}");
        seAssessment($case, $this->worker, 1000)->expenses()->create(['expense_type' => 'Food', 'amount' => 1]);
    }
    DB::flushQueryLog();
    $this->getJson(seUrl($this->patient))->assertOk();

    // Doubling the cases adds no queries.
    expect(count(DB::getQueryLog()))->toBe($queries);
});

it('rejects unauthenticated requests', function () {
    $this->app['auth']->forgetGuards();

    $this->getJson(seUrl($this->patient))->assertUnauthorized();
});

it('forbids a user without intake.view', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->getJson(seUrl($this->patient))->assertForbidden();
});

it('returns 404 for an unknown patient', function () {
    $this->getJson('/api/patients/999999/socioeconomic')->assertNotFound();
});
