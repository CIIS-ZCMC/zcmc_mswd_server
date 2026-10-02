<?php

use App\Models\Assessment;
use App\Models\CaseModel;
use App\Models\MswdClassificationMatrix;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->worker = User::factory()->create(['role' => 'Case Manager']);
    $this->worker->assignRole('Case Manager');

    $sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create([
        'sector_id' => $sector->id,
        'first_name' => 'Juan',
        'last_name' => 'Dela Cruz',
        'sex' => 'male',
    ]);

    $this->case = CaseModel::create([
        'patient_id' => $this->patient->id,
        'assigned_user_id' => $this->worker->id,
        'case_code' => 'CASE-ASSESS-1',
        'case_type' => 'medical',
        'priority_level' => 'high',
        'status' => 'open',
        'admission_type' => 'OPD',
        'date_opened' => now(),
    ]);

    Sanctum::actingAs($this->worker);
});

it('fetches the MSWD classification matrix', function () {
    $response = $this->getJson('/api/mswd-classification-matrix')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id', 'code', 'name', 'min_per_capita_income',
                    'max_per_capita_income', 'discount_percentage', 'is_indigent',
                ],
            ],
        ]);

    expect(count($response->json('data')))->toBeGreaterThanOrEqual(6);
});

it('auto-calculates net per capita income and MSWD bracket on store', function () {
    $response = $this->postJson("/api/cases/{$this->case->id}/assessments", [
        'total_family_income' => 4500,
        'housing_type' => 'owned',
        'utilities_access' => 'electricity,water',
    ])
        ->assertCreated()
        ->assertJsonPath('data.calculated_classification', 'C2')
        ->assertJsonPath('data.classification', 'C2')
        ->assertJsonPath('data.calculated_discount_rate', '75.00')
        ->assertJsonPath('data.has_override', false);

    $latestAssessment = $this->case->assessments()->latest()->first();
    expect($latestAssessment->classification)->toBe('C2');
});

it('supports social worker manual classification override with justification', function () {
    $this->postJson("/api/cases/{$this->case->id}/assessments", [
        'total_family_income' => 15000,
        'classification' => 'C3',
        'classification_override_reason' => 'Catastrophic medical expenses exceeding family budget',
    ])
        ->assertCreated()
        ->assertJsonPath('data.calculated_classification', 'A')
        ->assertJsonPath('data.classification', 'C3')
        ->assertJsonPath('data.has_override', true);

    $latestAssessment = $this->case->assessments()->latest()->first();
    expect($latestAssessment->classification)->toBe('C3');
});

it('creates a linked append-only re-assessment snapshot', function () {
    $parent = Assessment::create([
        'case_id' => $this->case->id,
        'created_by' => $this->worker->id,
        'classification' => 'B',
        'total_family_income' => 9000,
    ]);

    $this->postJson("/api/cases/{$this->case->id}/reassess", [
        'total_family_income' => 2000,
        'reassessment_reason' => 'Loss of household employment',
    ])
        ->assertCreated()
        ->assertJsonPath('data.parent_assessment_id', $parent->id)
        ->assertJsonPath('data.reassessment_reason', 'Loss of household employment')
        ->assertJsonPath('data.calculated_classification', 'C3');
});

it('promotes an intake assessment to a social case study report draft', function () {
    $assessment = Assessment::create([
        'case_id' => $this->case->id,
        'created_by' => $this->worker->id,
        'classification' => 'C1',
        'total_family_income' => 6000,
    ]);

    expect($assessment->social_case_status)->toBeNull();

    $this->postJson("/api/assessments/{$assessment->id}/promote-to-social-case")
        ->assertOk()
        ->assertJsonPath('data.social_case_status', 'draft');

    expect($assessment->fresh()->social_case_status)->toBe('draft');
});


it('keeps the whole re-assessment chain append-only and linked', function () {
    $first = Assessment::create([
        'case_id' => $this->case->id, 'created_by' => $this->worker->id,
        'classification' => 'B', 'total_family_income' => 9000,
    ]);

    $secondId = $this->postJson("/api/cases/{$this->case->id}/reassess", [
        'total_family_income' => 6000, 'reassessment_reason' => 'Reduced hours',
    ])->assertCreated()->json('data.id');

    $thirdId = $this->postJson("/api/cases/{$this->case->id}/reassess", [
        'total_family_income' => 2000, 'reassessment_reason' => 'Lost job',
    ])->assertCreated()->json('data.id');

    $second = Assessment::findOrFail($secondId);
    $third = Assessment::findOrFail($thirdId);

    // Each re-assessment points at the one before it; nothing is rewritten.
    expect($second->parent_assessment_id)->toBe($first->id)
        ->and($third->parent_assessment_id)->toBe($second->id)
        ->and($this->case->assessments()->count())->toBe(3)
        ->and($first->fresh()->total_family_income)->toBe('9000.00')
        ->and($first->fresh()->classification)->toBe('B')
        ->and($second->fresh()->total_family_income)->toBe('6000.00');
});

it('falls back to the calculated classification when it is cleared on update', function () {
    $assessment = Assessment::create([
        'case_id' => $this->case->id, 'created_by' => $this->worker->id,
        'classification' => 'indigent', 'total_family_income' => 4500,
    ]);

    $this->putJson("/api/assessments/{$assessment->id}", ['classification' => null])
        ->assertOk()
        ->assertJsonPath('data.classification', 'C2')
        ->assertJsonPath('data.calculated_classification', 'C2');
});

it('stores the informant name parts, address and contact, accepting the legacy contact alias', function () {
    $response = $this->postJson("/api/cases/{$this->case->id}/assessments", [
        'informant_name' => 'Reyes, Ana M.',
        'informant_last_name' => 'Reyes',
        'informant_first_name' => 'Ana',
        'informant_middle_name' => 'M.',
        'informant_relationship' => 'Mother',
        'informant_address' => 'Sta. Maria, Zamboanga City',
        'informant_contact' => '09171234567', // the form also sends informant_contact_number
        'total_family_income' => 4500,
    ])->assertCreated()
        ->assertJsonPath('data.informant_last_name', 'Reyes')
        ->assertJsonPath('data.informant_first_name', 'Ana')
        ->assertJsonPath('data.informant_middle_name', 'M.')
        ->assertJsonPath('data.informant_address', 'Sta. Maria, Zamboanga City')
        ->assertJsonPath('data.informant_contact_number', '09171234567');

    $this->putJson('/api/assessments/'.$response->json('data.id'), [
        'informant_contact_number' => '09999999999', 'informant_contact' => '09999999999',
    ])->assertOk()->assertJsonPath('data.informant_contact_number', '09999999999');
});

it('creates the nested expense lines with the assessment and classifies against them in one request', function () {
    $response = $this->postJson("/api/cases/{$this->case->id}/assessments", [
        'total_family_income' => 10000,
        'expenses' => [
            ['expense_type' => 'Food', 'amount' => 3000],
            ['expense_type' => 'House Rent', 'amount' => 3000],
        ],
    ])->assertCreated()
        ->assertJsonCount(2, 'data.expenses')
        // Net 4000 for a household of one is C2; with no expenses counted it would be B.
        ->assertJsonPath('data.net_per_capita_income', '4000.00')
        ->assertJsonPath('data.calculated_classification', 'C2')
        ->assertJsonPath('data.classification', 'C2');

    expect(Assessment::findOrFail($response->json('data.id'))->expenses()->sum('amount'))->toEqual(6000);
});

it('creates nested expense lines on a re-assessment too', function () {
    Assessment::create([
        'case_id' => $this->case->id, 'created_by' => $this->worker->id,
        'classification' => 'B', 'total_family_income' => 9000,
    ]);

    $this->postJson("/api/cases/{$this->case->id}/reassess", [
        'total_family_income' => 6000, 'reassessment_reason' => 'Lost job',
        'expenses' => [['expense_type' => 'Medical', 'amount' => 3500]],
    ])->assertCreated()
        ->assertJsonCount(1, 'data.expenses')
        ->assertJsonPath('data.calculated_classification', 'C3'); // net 2500
});

it('rejects an invalid nested expense line and writes nothing', function () {
    $this->postJson("/api/cases/{$this->case->id}/assessments", [
        'total_family_income' => 1000,
        'expenses' => [['expense_type' => 'Food', 'amount' => 100], ['amount' => -5]],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['expenses.1.expense_type', 'expenses.1.amount']);

    expect(Assessment::count())->toBe(0);
});

it('validates the mode of assistance and fund source vocabularies', function () {
    $this->postJson("/api/cases/{$this->case->id}/assessments", [
        'recommendation_mode' => 'Guarantee Letter', 'fund_source' => 'my pocket',
    ])->assertUnprocessable()->assertJsonValidationErrors(['recommendation_mode', 'fund_source']);

    $this->postJson("/api/cases/{$this->case->id}/assessments", [
        'recommendation_mode' => 'hospital_discount', 'fund_source' => 'maip',
    ])->assertCreated();
});

it('lists assessments newest first even when created in the same second', function () {
    $this->freezeTime();
    $first = Assessment::create(['case_id' => $this->case->id, 'created_by' => $this->worker->id, 'classification' => 'B']);
    $second = Assessment::create(['case_id' => $this->case->id, 'created_by' => $this->worker->id, 'classification' => 'C1']);

    $this->getJson("/api/cases/{$this->case->id}/assessments")
        ->assertOk()
        ->assertJsonPath('data.0.id', $second->id)
        ->assertJsonPath('data.1.id', $first->id);
});
