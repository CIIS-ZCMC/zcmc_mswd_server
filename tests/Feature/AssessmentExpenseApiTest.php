<?php

use App\Models\Assessment;
use App\Models\AssessmentExpense;
use App\Models\CaseModel;
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
    $patient = Patient::create([
        'sector_id' => $sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
    $this->case = CaseModel::create([
        'patient_id' => $patient->id, 'assigned_user_id' => $this->worker->id,
        'case_code' => 'CASE-EXP-1', 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'OPD', 'date_opened' => now(),
    ]);
    $this->assessment = Assessment::create([
        'case_id' => $this->case->id, 'created_by' => $this->worker->id,
        'classification' => 'indigent', 'total_family_income' => 10000,
    ]);

    Sanctum::actingAs($this->worker);
});

it('lists the expense lines under an assessment', function () {
    $this->assessment->expenses()->create(['expense_type' => 'food', 'amount' => 4000]);
    $this->assessment->expenses()->create(['expense_type' => 'rent', 'amount' => 2500]);

    $this->getJson("/api/assessments/{$this->assessment->id}/expenses")
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.expense_type', 'rent'); // latest first
});

it('creates an expense line', function () {
    $this->postJson("/api/assessments/{$this->assessment->id}/expenses", [
        'expense_type' => 'medicine', 'amount' => 1800.50,
    ])
        ->assertCreated()
        ->assertJsonPath('data.expense_type', 'medicine')
        ->assertJsonPath('data.assessment_id', $this->assessment->id);

    expect($this->assessment->expenses()->sum('amount'))->toEqual(1800.50);
});

it('corrects a mistyped amount', function () {
    $expense = $this->assessment->expenses()->create(['expense_type' => 'food', 'amount' => 40000]);

    $this->putJson("/api/assessment-expenses/{$expense->id}", ['amount' => 4000])
        ->assertOk()
        ->assertJsonPath('data.amount', '4000.00');

    // A partial write leaves the untouched column alone.
    expect($expense->refresh()->expense_type)->toBe('food');
});

it('deletes an expense line', function () {
    $expense = $this->assessment->expenses()->create(['expense_type' => 'food', 'amount' => 4000]);

    $this->deleteJson("/api/assessment-expenses/{$expense->id}")->assertNoContent();

    // Line items under a soft-deletable parent keep no softDeletes of their own.
    expect(AssessmentExpense::find($expense->id))->toBeNull();
});

it('validates the payload', function () {
    $this->postJson("/api/assessments/{$this->assessment->id}/expenses", ['amount' => -5])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['expense_type', 'amount']);
});

it('freezes expenses once the social case study is finalized', function () {
    $expense = $this->assessment->expenses()->create(['expense_type' => 'food', 'amount' => 4000]);

    $this->assessment->forceFill([
        'social_case_status' => Assessment::SOCIAL_CASE_FINALIZED,
        'social_case_no' => 'SCSR-2026-000001',
    ])->save();

    $this->postJson("/api/assessments/{$this->assessment->id}/expenses", ['expense_type' => 'rent', 'amount' => 1])
        ->assertStatus(422)
        ->assertJsonValidationErrors('assessment_id');

    $this->putJson("/api/assessment-expenses/{$expense->id}", ['amount' => 1])
        ->assertStatus(422)
        ->assertJsonValidationErrors('assessment_id');

    $this->deleteJson("/api/assessment-expenses/{$expense->id}")
        ->assertStatus(422)
        ->assertJsonValidationErrors('assessment_id');
});

it('still allows expense edits on a draft report', function () {
    $this->assessment->forceFill([
        'social_case_status' => Assessment::SOCIAL_CASE_DRAFT,
        'social_case_no' => 'SCSR-2026-000002',
    ])->save();

    $this->postJson("/api/assessments/{$this->assessment->id}/expenses", [
        'expense_type' => 'utilities', 'amount' => 900,
    ])->assertCreated();
});

it('requires the case permissions', function () {
    $outsider = User::factory()->create();
    Sanctum::actingAs($outsider);

    $this->getJson("/api/assessments/{$this->assessment->id}/expenses")->assertForbidden();
    $this->postJson("/api/assessments/{$this->assessment->id}/expenses", [
        'expense_type' => 'food', 'amount' => 100,
    ])->assertForbidden();
});
