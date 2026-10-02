<?php

use App\Models\Assessment;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\PatientFamilyMember;
use App\Models\Sector;
use App\Models\UisPrintLog;
use App\Models\User;
use App\Services\UnifiedIntakeSheetPdfService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->worker = User::factory()->create(['role' => 'MSS Head']);
    $this->worker->assignRole('MSS Head');

    $sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create([
        'sector_id' => $sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes',
        'sex' => 'female', 'birthdate' => '1980-01-01', 'civil_status' => 'Married',
        'address' => 'Sta. Maria', 'barangay' => 'Tetuan', 'municipality' => 'Zamboanga City',
    ]);
    PatientFamilyMember::create([
        'patient_id' => $this->patient->id, 'name' => 'Pedro Reyes', 'relationship' => 'spouse',
        'birthdate' => '1978-02-02', 'sex' => 'male', 'occupation' => 'Fisherman',
        'educational_attainment' => 'High school', 'monthly_income' => 6000,
    ]);
    $this->case = CaseModel::create([
        'patient_id' => $this->patient->id, 'assigned_user_id' => $this->worker->id,
        'case_code' => 'CASE-UIS-1', 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'OPD', 'transaction_id' => 555001,
        'transaction_type' => 'Outpatient Consultation', 'date_opened' => now(),
    ]);
});

function uisIntakeAssessment(CaseModel $case, User $author): Assessment
{
    $assessment = Assessment::create([
        'case_id' => $case->id, 'created_by' => $author->id, 'classification' => 'indigent',
        'total_family_income' => 6000, 'presenting_problem' => 'Cannot afford medicine',
    ]);
    $assessment->expenses()->create(['expense_type' => 'food', 'amount' => 3500]);

    return $assessment;
}

it('streams the ANNEX B PDF for a case and logs the print', function () {
    Sanctum::actingAs($this->worker);
    uisIntakeAssessment($this->case, $this->worker);

    $response = $this->get("/api/cases/{$this->case->id}/uis/pdf")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');

    expect(substr($response->getContent(), 0, 4))->toBe('%PDF');

    $log = UisPrintLog::sole();
    expect($log->case_id)->toBe($this->case->id)
        ->and($log->patient_id)->toBe($this->patient->id)
        ->and($log->printed_by)->toBe($this->worker->id)
        ->and($log->transaction_id)->toBe(555001)
        ->and($log->copies)->toBe(1);
});

it('has no stored intake sheet record or CRUD — the UIS is only a printable', function () {
    Sanctum::actingAs($this->worker);
    uisIntakeAssessment($this->case, $this->worker);

    $this->get("/api/cases/{$this->case->id}/uis/pdf")->assertOk();

    expect(Schema::hasTable('unified_intake_sheets'))->toBeTrue()
        ->and(Schema::hasTable('uis_print_logs'))->toBeTrue();

    $this->getJson('/api/intake-sheets')->assertNotFound();
});

it('forces an attachment download named after the case with ?download=1', function () {
    Sanctum::actingAs($this->worker);
    uisIntakeAssessment($this->case, $this->worker);

    $this->get("/api/cases/{$this->case->id}/uis/pdf?download=1")
        ->assertOk()
        ->assertHeader('content-disposition', 'attachment; filename=UIS-CASE-UIS-1.pdf');
});

it('does not log a print for ?preview=1', function () {
    Sanctum::actingAs($this->worker);
    uisIntakeAssessment($this->case, $this->worker);

    $this->get("/api/cases/{$this->case->id}/uis/pdf?preview=1")->assertOk();

    expect(UisPrintLog::count())->toBe(0);
});

it('logs one row per print', function () {
    Sanctum::actingAs($this->worker);
    uisIntakeAssessment($this->case, $this->worker);

    $this->get("/api/cases/{$this->case->id}/uis/pdf")->assertOk();
    $this->get("/api/cases/{$this->case->id}/uis/pdf")->assertOk();

    expect(UisPrintLog::count())->toBe(2);
});

it('renders the case patient, family and intake assessment into the ANNEX B view', function () {
    uisIntakeAssessment($this->case, $this->worker);

    // Rendering the view rather than the PDF: the other tests only check the
    // %PDF magic bytes, which a broken relation would sail straight past. Uses
    // the service's own transient-sheet builder so the real path is exercised.
    $pdf = app(UnifiedIntakeSheetPdfService::class)->renderForCase($this->case, $this->worker);
    $html = $pdf->getDomPDF()->outputHtml();

    // The official ANNEX B structure...
    expect($html)->toContain('UNIFIED INTAKE SHEET')
        ->and($html)->toContain('ANNEX B')
        ->and($html)->toContain('IDENTIFYING INFORMATION')
        ->and($html)->toContain('FAMILY COMPOSITION')
        ->and($html)->toContain('LIST OF EXPENSES')
        ->and($html)->toContain('PROBLEM PRESENTED')
        ->and($html)->toContain('RECOMMENDATION')
        // ...filled from the case's patient, family and intake assessment. Family
        // birthdates print YY/MM/DD, as on the paper form.
        ->and($html)->toContain('Reyes, Ana')
        ->and($html)->toContain('Pedro Reyes')
        ->and($html)->toContain('78/02/02')
        ->and($html)->toContain('High school')
        ->and($html)->toContain('Fisherman')
        ->and($html)->toContain('Cannot afford medicine')
        ->and($html)->toContain('3500')
        // The printing user is the interviewer; no draft watermark on a printable.
        ->and($html)->toContain($this->worker->employee_name)
        ->and($html)->not->toContain('DRAFT');
});

it('refuses to print a case with no intake assessment unless blank=1', function () {
    Sanctum::actingAs($this->worker);

    $this->getJson("/api/cases/{$this->case->id}/uis/pdf")
        ->assertStatus(409)
        ->assertJsonPath('code', 'uis_no_assessment');
    $this->getJson("/api/cases/{$this->case->id}/uis/pdf?preview=1")->assertStatus(409);
    expect(UisPrintLog::count())->toBe(0);

    // The blank fillable form stays available on request, and is logged.
    $this->get("/api/cases/{$this->case->id}/uis/pdf?blank=1")->assertOk();
    expect(UisPrintLog::count())->toBe(1);
});

it('does not count the social case study as the intake assessment', function () {
    Sanctum::actingAs($this->worker);
    Assessment::create([
        'case_id' => $this->case->id, 'created_by' => $this->worker->id, 'classification' => 'B',
        'social_case_status' => Assessment::SOCIAL_CASE_DRAFT,
    ]);

    $this->getJson("/api/cases/{$this->case->id}/uis/pdf")->assertStatus(409);
});

it('stores copies and remarks on the print row', function () {
    Sanctum::actingAs($this->worker);
    uisIntakeAssessment($this->case, $this->worker);

    $this->get("/api/cases/{$this->case->id}/uis/pdf?copies=3&remarks=For+PCSO+filing")->assertOk();

    $log = UisPrintLog::sole();
    expect($log->copies)->toBe(3)->and($log->remarks)->toBe('For PCSO filing');

    $this->getJson("/api/cases/{$this->case->id}/uis/prints")
        ->assertJsonPath('data.0.copies', 3)
        ->assertJsonPath('data.0.remarks', 'For PCSO filing');
});

it('validates the print options', function () {
    Sanctum::actingAs($this->worker);
    uisIntakeAssessment($this->case, $this->worker);

    $this->getJson("/api/cases/{$this->case->id}/uis/pdf?copies=0")
        ->assertUnprocessable()->assertJsonValidationErrors('copies');
    $this->getJson("/api/cases/{$this->case->id}/uis/pdf?copies=99")
        ->assertUnprocessable()->assertJsonValidationErrors('copies');
    expect(UisPrintLog::count())->toBe(0);
});

it('reports readiness: no assessment, then what is still missing, then ready', function () {
    Sanctum::actingAs($this->worker);

    $this->getJson("/api/cases/{$this->case->id}/uis")
        ->assertOk()
        ->assertJsonPath('data.has_assessment', false)
        ->assertJsonPath('data.ready', false)
        ->assertJsonPath('data.missing', ['assessment'])
        ->assertJsonPath('data.classification', null)
        ->assertJsonPath('data.print_count', 0);

    $assessment = Assessment::create([
        'case_id' => $this->case->id, 'created_by' => $this->worker->id, 'classification' => 'C2',
        'calculated_classification' => 'C2', 'calculated_discount_rate' => 75, 'total_family_income' => 4500,
    ]);

    // The patient already has a family member from beforeEach.
    $this->getJson("/api/cases/{$this->case->id}/uis")
        ->assertJsonPath('data.has_assessment', true)
        ->assertJsonPath('data.assessment_id', $assessment->id)
        ->assertJsonPath('data.missing', ['informant', 'problem_presented', 'recommendation'])
        ->assertJsonPath('data.classification.classification', 'C2')
        ->assertJsonPath('data.classification.has_override', false);

    $assessment->update([
        'informant_name' => 'Maria', 'presenting_problem' => 'Cannot afford medicine',
        'recommendation' => 'Medicine assistance',
    ]);
    $this->get("/api/cases/{$this->case->id}/uis/pdf")->assertOk();

    $this->getJson("/api/cases/{$this->case->id}/uis")
        ->assertJsonPath('data.ready', true)
        ->assertJsonPath('data.missing', [])
        ->assertJsonPath('data.print_count', 1)
        ->assertJsonStructure(['data' => ['last_printed_at']]);
});

it('forbids the readiness summary without intake.view', function () {
    $outsider = User::factory()->create();
    Sanctum::actingAs($outsider);

    $this->getJson("/api/cases/{$this->case->id}/uis")->assertForbidden();
});

it('lists the print history newest first with the printer', function () {
    Sanctum::actingAs($this->worker);

    $older = UisPrintLog::create([
        'case_id' => $this->case->id, 'patient_id' => $this->patient->id, 'transaction_id' => 555001,
        'printed_by' => $this->worker->id, 'printed_at' => now()->subDay(),
    ]);
    $newer = UisPrintLog::create([
        'case_id' => $this->case->id, 'patient_id' => $this->patient->id, 'transaction_id' => 555001,
        'printed_by' => $this->worker->id, 'printed_at' => now(),
    ]);

    $response = $this->getJson("/api/cases/{$this->case->id}/uis/prints")->assertOk();

    expect(collect($response->json('data'))->pluck('id')->all())->toBe([$newer->id, $older->id]);
    expect($response->json('data.0.printed_by.id'))->toBe($this->worker->id)
        ->and($response->json('data.0.transaction_id'))->toBe(555001);
});

it('scopes the print history to the case', function () {
    Sanctum::actingAs($this->worker);

    $other = CaseModel::create([
        'patient_id' => $this->patient->id, 'assigned_user_id' => $this->worker->id,
        'case_code' => 'CASE-UIS-2', 'case_type' => 'medical', 'priority_level' => 'low',
        'status' => 'open', 'admission_type' => 'OPD', 'transaction_id' => 555002, 'date_opened' => now(),
    ]);
    UisPrintLog::create([
        'case_id' => $other->id, 'patient_id' => $this->patient->id, 'transaction_id' => 555002,
        'printed_by' => $this->worker->id, 'printed_at' => now(),
    ]);

    $this->getJson("/api/cases/{$this->case->id}/uis/prints")
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('forbids printing and history without intake.view', function () {
    Sanctum::actingAs(User::factory()->create()); // no roles

    $this->get("/api/cases/{$this->case->id}/uis/pdf")->assertForbidden();
    $this->getJson("/api/cases/{$this->case->id}/uis/prints")->assertForbidden();

    expect(UisPrintLog::count())->toBe(0);
});

it('requires authentication', function () {
    $this->getJson("/api/cases/{$this->case->id}/uis/prints")->assertUnauthorized();
});

it('ticks the stored house, utility and problem checkboxes on the printable', function () {
    $assessment = uisIntakeAssessment($this->case, $this->worker);
    $assessment->update([
        'house_tenure' => 'owned',
        'light_source' => ['electricity'],
        'water_source' => ['artesian_well'],
        'problem_categories' => ['health'],
        'problem_specify' => 'Dialysis',
    ]);

    $html = app(UnifiedIntakeSheetPdfService::class)->renderForCase($this->case, $this->worker)
        ->getDomPDF()->outputHtml();

    // Exactly one X per single-choice group: 1 tenure + 1 light + 1 water + 1 problem
    // (the other sections use their own markup for ticked boxes).
    expect(substr_count($html, '<span class="cb">X</span>'))->toBeGreaterThanOrEqual(4)
        ->and($html)->toContain('Dialysis');
});

it('rejects unknown UIS checkbox values on assessment create', function () {
    Sanctum::actingAs($this->worker);

    $this->postJson("/api/cases/{$this->case->id}/assessments", [
        'house_tenure' => 'squatting',
        'light_source' => ['lava'],
        'problem_categories' => ['boredom'],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['house_tenure', 'light_source.0', 'problem_categories.0']);
});

it('stores the UIS informant, other income and recommendation fields through the API', function () {
    Sanctum::actingAs($this->worker);

    $response = $this->postJson("/api/cases/{$this->case->id}/assessments", [
        'informant_name' => 'Maria Reyes',
        'informant_relationship' => 'Daughter',
        'other_income_sources' => [
            ['source' => 'Remittance', 'amount' => 1500],
            ['source' => 'Sari-sari store', 'amount' => 500],
        ],
        'referral_source' => 'Ward 3',
        'medical_history' => 'Hypertension',
        'recommendation' => 'Provide medicine assistance',
        'recommendation_mode' => 'financial_assistance',
        'fund_source' => 'mswd',
    ])->assertCreated()
        ->assertJsonPath('data.informant_name', 'Maria Reyes')
        ->assertJsonPath('data.other_income_sources.1.source', 'Sari-sari store')
        ->assertJsonPath('data.referral_source', 'Ward 3')
        ->assertJsonPath('data.recommendation_mode', 'financial_assistance');

    $this->putJson('/api/assessments/'.$response->json('data.id'), ['fund_source' => 'pcso'])
        ->assertOk()
        ->assertJsonPath('data.fund_source', 'pcso')
        ->assertJsonPath('data.informant_name', 'Maria Reyes');
});

it('rejects an other-income entry without a source', function () {
    Sanctum::actingAs($this->worker);

    $this->postJson("/api/cases/{$this->case->id}/assessments", [
        'other_income_sources' => [['amount' => 100]],
    ])->assertUnprocessable()->assertJsonValidationErrors(['other_income_sources.0.source']);
});

it('prints the stored informant, other income, family civil status and recommendation mode', function () {
    $assessment = uisIntakeAssessment($this->case, $this->worker);
    $assessment->update([
        'informant_name' => 'Maria Reyes',
        'informant_relationship' => 'Daughter',
        'other_income_sources' => [['source' => 'Remittance', 'amount' => 1500], ['source' => 'Store', 'amount' => 500]],
        'recommendation_mode' => 'financial_assistance',
        'fund_source' => 'mswd',
    ]);
    $this->patient->familyMembers()->update(['civil_status' => 'widowed']);

    $html = app(UnifiedIntakeSheetPdfService::class)->renderForCase($this->case, $this->worker)
        ->getDomPDF()->outputHtml();

    expect($html)->toContain('Maria Reyes')
        ->and($html)->toContain('Daughter')
        ->and($html)->toContain('Remittance, Store')
        ->and($html)->toContain('2000')
        ->and($html)->toContain('Widowed')
        ->and($html)->toContain('Financial Assistance')
        ->and($html)->toContain('MSWD');
});

it('accepts a family member civil status', function () {
    Sanctum::actingAs($this->worker);

    $this->postJson("/api/patients/{$this->patient->id}/family-members", [
        'name' => 'Lola Reyes', 'civil_status' => 'widowed',
    ])->assertCreated()->assertJsonPath('data.civil_status', 'widowed');
});

it('prints the informant address and contact, falling back to the patient', function () {
    $assessment = uisIntakeAssessment($this->case, $this->worker);
    $this->patient->update(['contact_number' => '09170000001']);

    $html = fn () => app(UnifiedIntakeSheetPdfService::class)->renderForCase($this->case->fresh(), $this->worker)
        ->getDomPDF()->outputHtml();

    // No informant details recorded: the patient contact number prints.
    expect($html())->toContain('09170000001')->not->toContain('Informant Street');

    $assessment->update(['informant_address' => 'Informant Street 5', 'informant_contact_number' => '09175550000']);

    expect($html())->toContain('Informant Street 5')->toContain('09175550000');
});

it('keeps House help out of House/Lot and sums several Others lines', function () {
    $assessment = uisIntakeAssessment($this->case, $this->worker); // food 3500
    $assessment->expenses()->createMany([
        ['expense_type' => 'House Rent', 'amount' => 1200],
        ['expense_type' => 'House help', 'amount' => 777],
        ['expense_type' => 'Clothing', 'amount' => 321],
        ['expense_type' => 'Others: School fees', 'amount' => 100],
        ['expense_type' => 'Others', 'amount' => 50],
    ]);

    $html = app(UnifiedIntakeSheetPdfService::class)->renderForCase($this->case, $this->worker)
        ->getDomPDF()->outputHtml();

    // House/Lot gets only the rent: not House help, and not Clothing ("clothing" contains "lot").
    expect($html)->toContain('How much/Magkano: 1200')
        ->and($html)->toContain('HouseHelp (Kasambahay): <span class="u">777</span>')
        ->and($html)->toContain('Clothing(Kasuotan): <span class="u">321</span>')
        // Both Others lines add up; the School fees line is not also counted as Education.
        ->and($html)->toContain('Others(Iba pa): <span class="u">150</span>')
        ->and($html)->toContain('Education (Edukasyon): <span class="u">&nbsp;</span>');
});

it('prints the mode of assistance and fund source as labels', function () {
    $assessment = uisIntakeAssessment($this->case, $this->worker);
    $assessment->update(['recommendation_mode' => 'hospital_discount', 'fund_source' => 'maip']);

    $html = app(UnifiedIntakeSheetPdfService::class)->renderForCase($this->case, $this->worker)
        ->getDomPDF()->outputHtml();

    expect($html)->toContain('Hospital Discount')->toContain('MAIP')
        ->and($html)->not->toContain('hospital_discount');
});
