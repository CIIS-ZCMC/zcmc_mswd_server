<?php

use App\Actions\CalculateMswdClassificationAction;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\PatientFamilyMember;
use App\Models\Sector;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

// Feature suite, not Unit: the action reads the seeded classification matrix.
uses(RefreshDatabase::class);

function classify(?float $income, float $expenses = 0.0, int $household = 1): array
{
    return app(CalculateMswdClassificationAction::class)->execute($income, $expenses, null, $household);
}

it('classifies each side of every matrix boundary', function (float $income, string $code, float $discount) {
    $result = classify($income);

    expect($result['calculated_classification'])->toBe($code)
        ->and($result['calculated_discount_rate'])->toBe($discount);
})->with([
    'top of C3' => [3000.00, 'C3', 100.0],
    'bottom of C2' => [3000.01, 'C2', 75.0],
    'top of C2' => [5000.00, 'C2', 75.0],
    'bottom of C1' => [5000.01, 'C1', 50.0],
    'top of C1' => [7000.00, 'C1', 50.0],
    'bottom of B' => [7000.01, 'B', 25.0],
    'top of B' => [10000.00, 'B', 25.0],
    'bottom of A' => [10000.01, 'A', 0.0],
    'zero income' => [0.0, 'C3', 100.0],
]);

it('treats a missing income as zero', function () {
    expect(classify(null)['calculated_classification'])->toBe('C3');
});

it('subtracts expenses and floors the net income at zero', function () {
    // 12000 - 4000 = 8000 net → B; expenses above income never go negative.
    expect(classify(12000, 4000)['net_per_capita_income'])->toBe(8000.0)
        ->and(classify(12000, 4000)['calculated_classification'])->toBe('B')
        ->and(classify(1000, 5000)['net_per_capita_income'])->toBe(0.0);
});

it('divides net income across the household', function () {
    $result = classify(12000, 0, household: 4);

    expect($result['net_per_capita_income'])->toBe(3000.0)
        ->and($result['calculated_classification'])->toBe('C3');
});

it('counts the patient plus family members as the household when given a case', function () {
    $sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $patient = Patient::create(['sector_id' => $sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female']);
    foreach (['Pedro', 'Luz'] as $name) {
        PatientFamilyMember::create(['patient_id' => $patient->id, 'name' => $name]);
    }
    $case = CaseModel::create([
        'patient_id' => $patient->id, 'assigned_user_id' => User::factory()->create()->id,
        'case_code' => 'CASE-CLS-1', 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'OPD', 'date_opened' => now(),
    ]);

    $result = app(CalculateMswdClassificationAction::class)->execute(9000, 0, $case);

    // 2 family members + the patient = 3 → 3000 each.
    expect($result['net_per_capita_income'])->toBe(3000.0);
});

it('falls back to built-in brackets when the matrix has no rows', function (float $income, string $code, float $discount) {
    DB::table('mswd_classification_matrices')->delete();

    $result = classify($income);

    expect($result['calculated_classification'])->toBe($code)
        ->and($result['calculated_discount_rate'])->toBe($discount)
        ->and($result['max_assistance_cap'])->toBeNull();
})->with([
    'A' => [10000.01, 'A', 0.0],
    'B' => [10000.00, 'B', 25.0],
    'C1' => [7000.00, 'C1', 50.0],
    'C2' => [5000.00, 'C2', 75.0],
    'C3' => [3000.00, 'C3', 100.0],
]);
