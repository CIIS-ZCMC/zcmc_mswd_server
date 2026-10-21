<?php

use App\Models\Assessment;
use App\Models\Bizbox\HospitalPatient;
use App\Models\Bizbox\PatientTransaction;
use App\Models\Bizbox\TransactionType;
use App\Models\Patient;
use App\Models\PatientFamilyMember;
use App\Models\PatientId;
use App\Models\Sector;
use App\Models\User;
use App\Repositories\Contracts\PatientTransactionRepositoryInterface;
use App\Services\UisSnapshotService;
use App\Services\UnifiedIntakeSheetPdfService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->worker = User::factory()->create(['role' => 'MSS Head', 'employee_name' => 'Rosa Cruz']);
    $this->worker->assignRole('MSS Head');

    $this->patient = Patient::create([
        'sector_id' => Sector::firstOrCreate(['code' => 'MED'], ['name' => 'Medical'])->id,
        'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female', 'hospital_id' => 777,
        'birthdate' => '1990-03-04', 'occupation' => 'Vendor', 'monthly_income' => 4000,
        'address' => 'Zone 1', 'barangay' => 'Sta. Maria',
    ]);
});

/** HIS encounter 42, so the intake endpoint has an encounter to anchor to. */
function snapshotEncounter(int $transactionId = 42): void
{
    $encounter = (new PatientTransaction)->forceFill([
        'PK_psPatRegisters' => $transactionId, 'registrydate' => '2026-09-14 08:30:00', 'pattrantype' => 'O',
    ]);
    $encounter->setRelation('patient', (new HospitalPatient)->forceFill(['PK_emdPatients' => 5, 'patid' => 777]));
    $encounter->setRelation('transactionType', (new TransactionType)->forceFill(['PK_mscHospTranTypes' => 8, 'description' => 'Outpatient Consultation']));

    test()->mock(PatientTransactionRepositoryInterface::class, function ($mock) use ($encounter) {
        $mock->shouldReceive('find')->andReturn($encounter);
    });
}

function takeIntake(array $overrides = []): Assessment
{
    $response = test()->postJson('/api/patients/'.test()->patient->id.'/intake-assessments', array_merge([
        'his_transaction_id' => 42,
        'total_family_income' => 9000,
        'informant_name' => 'Maria Reyes',
        'presenting_problem' => 'Medicines',
    ], $overrides))->assertCreated();

    return Assessment::findOrFail($response->json('data.id'));
}

/** The rendered sheet as HTML, so its contents can be asserted. */
function renderSheet(Assessment $assessment, ?User $printedBy = null): string
{
    return app(UnifiedIntakeSheetPdfService::class)
        ->renderForAssessment($assessment->fresh(), $printedBy ?? test()->worker)
        ->getDomPDF()->outputHtml();
}

it('freezes the patient and family composition when the intake is taken', function () {
    Sanctum::actingAs($this->worker);
    snapshotEncounter();
    PatientFamilyMember::create([
        'patient_id' => $this->patient->id, 'name' => 'Pedro Reyes', 'relationship' => 'Father',
        'occupation' => 'Fisherman', 'educational_attainment' => 'High school',
    ]);

    $intake = takeIntake();
    $snapshot = $intake->uis_snapshot;

    expect($snapshot['patient']['full_name'])->toBe('Reyes, Ana')
        ->and($snapshot['patient']['occupation'])->toBe('Vendor')
        ->and($snapshot['patient']['present_address'])->toBe('Zone 1, Sta. Maria')
        ->and($snapshot['family_members'])->toHaveCount(1)
        ->and($snapshot['family_members'][0]['name'])->toBe('Pedro Reyes')
        ->and($snapshot['household_size'])->toBe(2)
        ->and($intake->household_size)->toBe(2)
        ->and($intake->uis_snapshot_at)->not->toBeNull();
});

it('keeps an issued sheet unchanged when a family member is added, edited or removed', function () {
    Sanctum::actingAs($this->worker);
    snapshotEncounter();
    $pedro = PatientFamilyMember::create([
        'patient_id' => $this->patient->id, 'name' => 'Pedro Reyes', 'occupation' => 'Fisherman',
    ]);

    $intake = takeIntake();
    expect(renderSheet($intake))->toContain('Pedro Reyes', 'Fisherman');

    // Everything the patient's family tab can do, after the sheet was issued.
    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Luz Reyes']);
    $pedro->update(['occupation' => 'Driver']);
    $pedro->delete();

    $html = renderSheet($intake);

    expect($html)->toContain('Pedro Reyes', 'Fisherman')
        ->and($html)->not->toContain('Luz Reyes')
        ->and($html)->not->toContain('Driver')
        ->and($intake->fresh()->household_size)->toBe(2);
});

it('keeps an issued sheet unchanged when the patient demographics change', function () {
    Sanctum::actingAs($this->worker);
    snapshotEncounter();

    $intake = takeIntake();

    $this->patient->update([
        'last_name' => 'Santos', 'occupation' => 'Teacher', 'address' => 'Zone 9', 'barangay' => 'Tetuan',
    ]);

    $html = renderSheet($intake);

    expect($html)->toContain('Reyes, Ana', 'Vendor', 'Zone 1, Sta. Maria')
        ->and($html)->not->toContain('Santos')
        ->and($html)->not->toContain('Teacher');
});

it('keeps the PhilHealth number the patient had at intake', function () {
    Sanctum::actingAs($this->worker);
    snapshotEncounter();
    PatientId::create([
        'patient_id' => $this->patient->id, 'id_type' => 'PhilHealth', 'id_number' => '11-111111111-1',
    ]);

    $intake = takeIntake();
    PatientId::where('patient_id', $this->patient->id)->update(['id_number' => '22-222222222-2']);

    expect(renderSheet($intake))->toContain('11-111111111-1')
        ->and(renderSheet($intake))->not->toContain('22-222222222-2');
});

it('does not age the patient when the sheet is reprinted later', function () {
    Sanctum::actingAs($this->worker);
    snapshotEncounter();

    $intake = takeIntake();
    $ageAtIntake = $intake->uis_snapshot['patient']['age'];

    $this->travel(5)->years();

    expect($intake->fresh()->uis_snapshot['patient']['age'])->toBe($ageAtIntake)
        ->and(renderSheet($intake))->toContain((string) $ageAtIntake);
});

it('prints the interview date and the worker who conducted it, not the reprint', function () {
    Sanctum::actingAs($this->worker);
    snapshotEncounter();

    $intake = takeIntake();

    expect($intake->interviewed_by)->toBe($this->worker->id)
        ->and($intake->interviewed_at->toDateString())->toBe('2026-09-14');

    // A different worker reprints it a year on.
    $other = User::factory()->create(['role' => 'MSS Head', 'employee_name' => 'Jose Dela Cruz']);
    $this->travel(1)->years();
    $html = renderSheet($intake, $other);

    expect($html)->toContain('09/14/2026', 'Rosa Cruz')
        ->and($html)->not->toContain('Jose Dela Cruz');
});

it('gives a later intake the new data while the earlier one keeps the old', function () {
    Sanctum::actingAs($this->worker);
    snapshotEncounter();
    $first = takeIntake();

    $this->patient->update(['occupation' => 'Teacher']);
    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Luz Reyes']);

    // A second encounter, so this is a second intake rather than an edit.
    snapshotEncounter(43);
    $second = takeIntake(['his_transaction_id' => 43]);

    expect($first->uis_snapshot['patient']['occupation'])->toBe('Vendor')
        ->and($first->uis_snapshot['family_members'])->toHaveCount(0)
        ->and($first->household_size)->toBe(1)
        ->and($second->uis_snapshot['patient']['occupation'])->toBe('Teacher')
        ->and($second->uis_snapshot['family_members'])->toHaveCount(1)
        ->and($second->household_size)->toBe(2);
});

it('keeps the frozen copy when the assessment itself is edited', function () {
    Sanctum::actingAs($this->worker);
    snapshotEncounter();
    $intake = takeIntake();

    $this->patient->update(['occupation' => 'Teacher']);

    $this->putJson("/api/assessments/{$intake->id}", ['informant_name' => 'Corrected Name'])->assertOk();

    expect($intake->fresh()->uis_snapshot['patient']['occupation'])->toBe('Vendor')
        ->and($intake->fresh()->informant_name)->toBe('Corrected Name');
});

it('divides the per-capita income by the frozen household, not today\'s family', function () {
    Sanctum::actingAs($this->worker);
    snapshotEncounter();
    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Pedro Reyes']);

    // 9000 income, no expenses, household of 2.
    $intake = takeIntake();
    expect((float) $intake->net_per_capita_income)->toBe(4500.00);

    // Three more members today; an expense write must not re-divide by 5.
    foreach (['Luz', 'Ben', 'Ana'] as $name) {
        PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => $name]);
    }

    $this->postJson("/api/assessments/{$intake->id}/expenses", ['expense_type' => 'Food', 'amount' => 1000])
        ->assertCreated();

    // (9000 - 1000) / 2, the household at intake.
    expect((float) $intake->fresh()->net_per_capita_income)->toBe(4000.00);
});

it('refreshes the frozen copy on request, stamping who and when', function () {
    Sanctum::actingAs($this->worker);
    snapshotEncounter();
    $intake = takeIntake();

    $this->patient->update(['occupation' => 'Teacher']);
    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Luz Reyes']);

    $other = User::factory()->create(['role' => 'MSS Head']);
    $other->assignRole('MSS Head');
    Sanctum::actingAs($other);

    $this->postJson("/api/assessments/{$intake->id}/uis-snapshot/refresh")
        ->assertOk()
        ->assertJsonPath('data.household_size', 2);

    $refreshed = $intake->fresh();

    expect($refreshed->uis_snapshot['patient']['occupation'])->toBe('Teacher')
        ->and($refreshed->uis_snapshot['family_members'])->toHaveCount(1)
        ->and($refreshed->household_size)->toBe(2)
        ->and($refreshed->uis_snapshot_by)->toBe($other->id)
        // The classification follows the household it now divides by.
        ->and((float) $refreshed->net_per_capita_income)->toBe(4500.00)
        ->and(renderSheet($refreshed))->toContain('Luz Reyes', 'Teacher');
});

it('refuses a refresh without cases.update, and for a social case study', function () {
    Sanctum::actingAs($this->worker);
    snapshotEncounter();
    $intake = takeIntake();

    $viewer = User::factory()->create(['role' => 'Processor']);
    $viewer->assignRole('Processor');
    Sanctum::actingAs($viewer);
    $this->postJson("/api/assessments/{$intake->id}/uis-snapshot/refresh")->assertForbidden();

    Sanctum::actingAs($this->worker);
    $intake->update(['social_case_status' => Assessment::SOCIAL_CASE_DRAFT]);
    $this->postJson("/api/assessments/{$intake->id}/uis-snapshot/refresh")->assertNotFound();
});

it('keeps the frozen copy out of the audit trail', function () {
    Sanctum::actingAs($this->worker);
    snapshotEncounter();
    $intake = takeIntake();

    $this->postJson("/api/assessments/{$intake->id}/uis-snapshot/refresh")->assertOk();

    $logged = $intake->activities()->get()->flatMap(
        fn ($activity) => array_keys($activity->properties->get('attributes') ?? [])
    );

    expect($logged)->not->toContain('uis_snapshot')
        ->and($logged)->toContain('uis_snapshot_at');
});

it('still renders a sheet for an assessment with no frozen copy', function () {
    Sanctum::actingAs($this->worker);
    snapshotEncounter();
    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Pedro Reyes']);

    $intake = takeIntake();
    // A row from before snapshots existed.
    $intake->forceFill(['uis_snapshot' => null])->saveQuietly();

    // Falls back to the live patient, through the same shape.
    expect(renderSheet($intake))->toContain('Reyes, Ana', 'Pedro Reyes');
});

it('backfills an intake that predates the frozen copy', function () {
    Sanctum::actingAs($this->worker);
    snapshotEncounter();
    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Pedro Reyes']);

    $intake = takeIntake();
    // As the row looked before the snapshot columns existed.
    $intake->forceFill([
        'uis_snapshot' => null, 'uis_snapshot_at' => null, 'interviewed_at' => null,
        'interviewed_by' => null, 'household_size' => null,
    ])->saveQuietly();

    expect(app(UisSnapshotService::class)->backfill())->toBe(1);

    $filled = $intake->fresh();

    expect($filled->uis_snapshot['patient']['full_name'])->toBe('Reyes, Ana')
        ->and($filled->uis_snapshot['family_members'])->toHaveCount(1)
        ->and($filled->household_size)->toBe(2)
        ->and($filled->interviewed_by)->toBe($this->worker->id)
        ->and($filled->interviewed_at->toDateString())->toBe('2026-09-14');

    // Idempotent: a second run has nothing left to do.
    expect(app(UisSnapshotService::class)->backfill())->toBe(0);
});

it('leaves a social case study out of the backfill', function () {
    Sanctum::actingAs($this->worker);
    snapshotEncounter();
    $intake = takeIntake();
    $intake->forceFill(['uis_snapshot' => null, 'social_case_status' => Assessment::SOCIAL_CASE_DRAFT])->saveQuietly();

    expect(app(UisSnapshotService::class)->backfill())->toBe(0)
        ->and($intake->fresh()->uis_snapshot)->toBeNull();
});

it('reports the frozen household on the patient UIS tab', function () {
    Sanctum::actingAs($this->worker);
    snapshotEncounter();
    $intake = takeIntake();

    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Luz Reyes']);

    $row = collect($this->getJson("/api/patients/{$this->patient->id}/uis")->assertOk()->json('data'))
        ->firstWhere('uis.assessment_id', $intake->id);

    expect($row['uis']['household_size'])->toBe(1)
        ->and($row['uis']['assessment']['uis_snapshot']['family_members'])->toHaveCount(0);
});
