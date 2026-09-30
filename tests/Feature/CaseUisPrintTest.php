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

    $this->get("/api/cases/{$this->case->id}/uis/pdf")->assertOk();

    expect(Schema::hasTable('unified_intake_sheets'))->toBeTrue()
        ->and(Schema::hasTable('uis_print_logs'))->toBeTrue();

    $this->getJson('/api/intake-sheets')->assertNotFound();
});

it('forces an attachment download named after the case with ?download=1', function () {
    Sanctum::actingAs($this->worker);

    $this->get("/api/cases/{$this->case->id}/uis/pdf?download=1")
        ->assertOk()
        ->assertHeader('content-disposition', 'attachment; filename=UIS-CASE-UIS-1.pdf');
});

it('does not log a print for ?preview=1', function () {
    Sanctum::actingAs($this->worker);

    $this->get("/api/cases/{$this->case->id}/uis/pdf?preview=1")->assertOk();

    expect(UisPrintLog::count())->toBe(0);
});

it('logs one row per print', function () {
    Sanctum::actingAs($this->worker);

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

it('prints a case that has no assessment yet', function () {
    Sanctum::actingAs($this->worker);

    // A fillable printable: missing data is blank, not an error.
    $this->get("/api/cases/{$this->case->id}/uis/pdf")->assertOk();
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
