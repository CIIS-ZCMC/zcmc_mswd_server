<?php

use App\Models\Assessment;
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

    $this->processor = iuUser('Processor');
    $this->head = iuUser('Head');

    $this->patient = Patient::create([
        'sector_id' => Sector::firstOrCreate(['code' => 'MED'], ['name' => 'Medical'])->id,
        'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female', 'hospital_id' => 777,
    ]);

    // An intake (no social case status) and an SCSR on a case.
    $this->intake = Assessment::create([
        'patient_id' => $this->patient->id, 'his_transaction_id' => 42,
        'created_by' => $this->processor->id, 'total_family_income' => 9000, 'classification' => 'C3',
    ]);

    $case = CaseModel::create([
        'patient_id' => $this->patient->id, 'assigned_user_id' => $this->processor->id,
        'case_code' => 'CASE-1', 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'OPD', 'date_opened' => now(),
    ]);
    $this->scsr = Assessment::create([
        'patient_id' => $this->patient->id, 'case_id' => $case->id,
        'created_by' => $this->processor->id, 'social_case_status' => Assessment::SOCIAL_CASE_DRAFT,
        'classification' => 'C3',
    ]);
});

function iuUser(string $role): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

it('lets a processor edit an intake they can take', function () {
    Sanctum::actingAs($this->processor);

    $this->putJson("/api/assessments/{$this->intake->id}", ['informant_name' => 'Maria Reyes'])
        ->assertOk()
        ->assertJsonPath('data.informant_name', 'Maria Reyes');
});

it('keeps a social case study behind cases.update', function () {
    Sanctum::actingAs($this->processor);

    $this->putJson("/api/assessments/{$this->scsr->id}", ['informant_name' => 'Maria Reyes'])->assertForbidden();
    $this->postJson("/api/assessments/{$this->scsr->id}/expenses", ['expense_type' => 'Food', 'amount' => 100])->assertForbidden();
});

it('lets a processor add, change and remove the lines of an intake', function () {
    Sanctum::actingAs($this->processor);

    $id = $this->postJson("/api/assessments/{$this->intake->id}/expenses", ['expense_type' => 'Food', 'amount' => 3000])
        ->assertCreated()
        ->json('data.id');

    $this->putJson("/api/assessment-expenses/{$id}", ['amount' => 3500])->assertOk();
    $this->deleteJson("/api/assessment-expenses/{$id}")->assertNoContent();
});

it('refuses intake edits from a role without intake.update or cases.update', function () {
    Sanctum::actingAs($this->head);

    $this->putJson("/api/assessments/{$this->intake->id}", ['informant_name' => 'X'])->assertForbidden();
    $this->postJson("/api/assessments/{$this->intake->id}/expenses", ['expense_type' => 'Food', 'amount' => 100])->assertForbidden();
});

it('lets a processor refresh an intake snapshot but never an SCSR', function () {
    Sanctum::actingAs($this->processor);

    $this->postJson("/api/assessments/{$this->intake->id}/uis-snapshot/refresh")->assertOk();
    $this->postJson("/api/assessments/{$this->scsr->id}/uis-snapshot/refresh")->assertNotFound();

    Sanctum::actingAs($this->head);
    $this->postJson("/api/assessments/{$this->intake->id}/uis-snapshot/refresh")->assertForbidden();
});

it('does not let a processor delete an assessment', function () {
    Sanctum::actingAs($this->processor);

    $this->deleteJson("/api/assessments/{$this->intake->id}")->assertForbidden();
});
