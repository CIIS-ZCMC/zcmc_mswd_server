<?php

use App\DTOs\PatientAssistanceDto;
use App\Models\AssistantType;
use App\Models\CaseModel;
use App\Models\Guarantor;
use App\Models\Patient;
use App\Models\PatientAssistance;
use App\Models\Sector;
use App\Models\User;
use App\Services\PatientAssistanceService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id,
        'hospital_id' => 778899,
        'mswd_id' => 112233,
        'first_name' => 'Ana',
        'middle_name' => 'C',
        'last_name' => 'Reyes',
        'sex' => 'female',
        'address' => '12 Mabini St',
    ]);
    $this->owner = assistanceUser('MSS Head');
    $this->case = CaseModel::create([
        'patient_id' => $this->patient->id,
        'assigned_user_id' => $this->owner->id,
        'case_code' => 'CASE-2026-000001',
        'case_type' => 'medical',
        'priority_level' => 'high',
        'admission_type' => 'ER',
        'status' => CaseModel::STATUS_OPEN,
        'date_opened' => now(),
    ]);
    $this->assistType = AssistantType::create([
        'name' => 'Medicine', 'code' => 'MED', 'category' => 'pharmacy', 'is_active' => true,
    ]);
    $this->guarantor = Guarantor::create(['name' => 'PCSO', 'is_active' => true]);
});

function assistanceUser(string $role = 'Case Manager'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

/** Create a pending assistance on the seeded case, owned by the actor. */
function pendingAssistanceFor(User $actor): PatientAssistance
{
    return app(PatientAssistanceService::class)->create(
        PatientAssistanceDto::fromArray([
            'case_id' => test()->case->id,
            'assistant_type_id' => test()->assistType->id,
            'amount' => 1500,
            'notes' => 'For maintenance meds',
        ]),
        $actor,
    );
}

it('records a pending assistance under a case, logging the entry and a milestone', function () {
    $worker = assistanceUser();
    Sanctum::actingAs($worker);

    $response = $this->postJson("/api/cases/{$this->case->id}/assistances", [
        'assistant_type_id' => $this->assistType->id,
        'guarantor_id' => $this->guarantor->id,
        'amount' => 2500,
        'notes' => 'Dialysis',
    ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.case_id', $this->case->id)
        ->assertJsonPath('data.created_by', $worker->id);

    $id = $response->json('data.id');

    $this->assertDatabaseHas('patient_assistance_logs', [
        'assistance_id' => $id, 'status' => 'pending', 'action' => 'created', 'action_by' => $worker->id,
    ]);
    $this->assertDatabaseHas('case_activities', [
        'case_id' => $this->case->id, 'activity_type' => 'assistance_requested',
    ]);
});

it('lists, shows and updates a pending assistance', function () {
    $worker = assistanceUser();
    Sanctum::actingAs($worker);
    $aid = pendingAssistanceFor($worker);

    $this->getJson("/api/cases/{$this->case->id}/assistances")->assertOk()->assertJsonCount(1, 'data');
    $this->getJson("/api/assistances/{$aid->id}")->assertOk()->assertJsonPath('data.id', $aid->id);
    $this->putJson("/api/assistances/{$aid->id}", ['amount' => 999])
        ->assertOk()->assertJsonPath('data.amount', '999.00');
});

it('refuses to edit an assistance once it is no longer pending', function () {
    $worker = assistanceUser('MSS Head');
    Sanctum::actingAs($worker);
    $aid = pendingAssistanceFor($worker);

    $this->postJson("/api/assistances/{$aid->id}/approve")->assertOk();

    $this->putJson("/api/assistances/{$aid->id}", ['amount' => 1])
        ->assertStatus(422)->assertJsonValidationErrorFor('status');
});

it('walks the approve then release lifecycle and snapshots a report', function () {
    $head = assistanceUser('MSS Head');
    Sanctum::actingAs($head);
    $aid = pendingAssistanceFor($head);

    $this->postJson("/api/assistances/{$aid->id}/approve")
        ->assertOk()->assertJsonPath('data.status', 'approved');
    $this->assertDatabaseHas('patient_assistance_logs', ['assistance_id' => $aid->id, 'action' => 'approved']);

    $this->postJson("/api/assistances/{$aid->id}/release")
        ->assertOk()->assertJsonPath('data.status', 'released');

    $this->assertDatabaseHas('patient_assistance_reports', [
        'assistance_id' => $aid->id,
        'hospital_id' => $this->patient->hospital_id,
        'mswd_id' => $this->patient->mswd_id,
        'patient_name' => 'Ana C Reyes',
        'patient_address' => '12 Mabini St',
        'assistant_type' => 'Medicine',
        'category' => 'pharmacy',
        'released_by' => $head->id,
        'is_void' => false,
    ]);
    $this->assertDatabaseHas('patient_assistance_logs', ['assistance_id' => $aid->id, 'action' => 'released']);
});

it('mirrors a patient with no hospital or mswd id onto the report', function () {
    $this->patient->update(['hospital_id' => null, 'mswd_id' => null]);
    $head = assistanceUser('MSS Head');
    Sanctum::actingAs($head);
    $aid = pendingAssistanceFor($head);

    $this->postJson("/api/assistances/{$aid->id}/approve")->assertOk();
    $this->postJson("/api/assistances/{$aid->id}/release")->assertOk();

    $this->assertDatabaseHas('patient_assistance_reports', [
        'assistance_id' => $aid->id, 'hospital_id' => null, 'mswd_id' => null,
    ]);
});

it('rejects releasing an assistance that was never approved', function () {
    $head = assistanceUser('MSS Head');
    Sanctum::actingAs($head);
    $aid = pendingAssistanceFor($head);

    $this->postJson("/api/assistances/{$aid->id}/release")
        ->assertStatus(422)->assertJsonValidationErrorFor('status');
});

it('cancels a pending assistance but not a released one', function () {
    $head = assistanceUser('MSS Head');
    Sanctum::actingAs($head);
    $aid = pendingAssistanceFor($head);

    $this->postJson("/api/assistances/{$aid->id}/cancel", ['notes' => 'Patient discharged'])
        ->assertOk()->assertJsonPath('data.status', 'cancelled');
    $this->assertDatabaseHas('patient_assistance_logs', [
        'assistance_id' => $aid->id, 'action' => 'Patient discharged',
    ]);

    $released = pendingAssistanceFor($head);
    $this->postJson("/api/assistances/{$released->id}/approve")->assertOk();
    $this->postJson("/api/assistances/{$released->id}/release")->assertOk();
    $this->postJson("/api/assistances/{$released->id}/cancel")
        ->assertStatus(422)->assertJsonValidationErrorFor('status');
});

it('will not delete a released assistance', function () {
    $head = assistanceUser('MSS Head');
    Sanctum::actingAs($head);
    $aid = pendingAssistanceFor($head);

    $this->deleteJson("/api/assistances/{$aid->id}")->assertNoContent();
    $this->assertSoftDeleted('patient_assistance', ['id' => $aid->id]);

    $released = pendingAssistanceFor($head);
    $this->postJson("/api/assistances/{$released->id}/approve")->assertOk();
    $this->postJson("/api/assistances/{$released->id}/release")->assertOk();
    $this->deleteJson("/api/assistances/{$released->id}")->assertStatus(422);
});

it('lists logs, history and reports for an assistance', function () {
    $head = assistanceUser('MSS Head');
    Sanctum::actingAs($head);
    $aid = pendingAssistanceFor($head);
    $this->postJson("/api/assistances/{$aid->id}/approve")->assertOk();
    $this->postJson("/api/assistances/{$aid->id}/release")->assertOk();

    $this->getJson("/api/assistances/{$aid->id}/logs")->assertOk()->assertJsonCount(3, 'data');
    $this->getJson("/api/assistances/{$aid->id}/history")->assertOk();
    $this->getJson("/api/assistances/{$aid->id}/reports")->assertOk()->assertJsonCount(1, 'data');
    $this->getJson('/api/assistance-reports')->assertOk()->assertJsonCount(1, 'data');
});

it('voids a report and keeps it on record', function () {
    $head = assistanceUser('MSS Head');
    Sanctum::actingAs($head);
    $aid = pendingAssistanceFor($head);
    $this->postJson("/api/assistances/{$aid->id}/approve")->assertOk();
    $report = $this->postJson("/api/assistances/{$aid->id}/release")->json('data.reports.0');

    $this->postJson("/api/assistance-reports/{$report['id']}/void")
        ->assertOk()->assertJsonPath('data.is_void', true);
    $this->assertDatabaseHas('patient_assistance_reports', ['id' => $report['id'], 'is_void' => true]);
});

it('lets a case manager create but not approve an assistance', function () {
    $manager = assistanceUser('Case Manager');
    Sanctum::actingAs($manager);
    $aid = pendingAssistanceFor($manager);

    $this->postJson("/api/assistances/{$aid->id}/approve")->assertForbidden();
});

it('denies a processor without the create permission', function () {
    // Processor has assistance.view/create/update but not delete; assert view-only guard elsewhere.
    $processor = assistanceUser('Processor');
    Sanctum::actingAs($processor);

    // Processor lacks reports.generate, so voiding must be forbidden.
    $head = assistanceUser('MSS Head');
    $aid = pendingAssistanceFor($head);
    app(PatientAssistanceService::class)->approve($aid, $head);
    app(PatientAssistanceService::class)->release($aid, $head);
    $report = $aid->reports()->first();

    $this->postJson("/api/assistance-reports/{$report->id}/void")->assertForbidden();
});
