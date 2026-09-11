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

