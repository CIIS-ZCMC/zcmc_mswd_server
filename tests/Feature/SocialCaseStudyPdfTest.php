<?php

use App\Models\Assessment;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\PatientFamilyMember;
use App\Models\Sector;
use App\Models\User;
use App\Services\SocialCaseStudyPdfService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake();
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->head = User::factory()->create(['role' => 'MSS Head']);
    $this->head->assignRole('MSS Head');

    $sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create([
        'sector_id' => $sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes',
        'sex' => 'female', 'birthdate' => '1980-01-01', 'address' => 'Sta. Maria',
        'barangay' => 'Tetuan', 'municipality' => 'Zamboanga City',
    ]);
    PatientFamilyMember::create([
        'patient_id' => $this->patient->id, 'name' => 'Pedro Reyes', 'relationship' => 'spouse',
        'birthdate' => '1978-02-02', 'sex' => 'male', 'occupation' => 'Fisherman',
        'educational_attainment' => 'High school', 'monthly_income' => 6000,
    ]);
    $this->case = CaseModel::create([
        'patient_id' => $this->patient->id, 'assigned_user_id' => $this->head->id,
        'case_code' => 'CASE-PDF-1', 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'OPD', 'date_opened' => now(),
    ]);
});

function makeScsrForPdf(CaseModel $case, User $author, array $overrides = []): Assessment
{
    $assessment = Assessment::create(array_merge([
        'case_id' => $case->id,
        'created_by' => $author->id,
        'prepared_by' => $author->id,
        'prepared_at' => now(),
        'classification' => 'indigent',
        'social_case_status' => Assessment::SOCIAL_CASE_DRAFT,
        'social_case_no' => 'SCSR-2026-000001',
        'revision' => 1,
        'total_family_income' => 12000,
        'housing_type' => 'Owned',
        'utilities_access' => 'Electricity and water',
        'referral_source' => 'ward_referral',
        'reason_for_referral' => 'Endorsed by Ward 3 for financial assistance',
        'presenting_problem' => 'Cannot afford maintenance medicine',
        'family_background' => 'Nuclear family of four',
        'medical_history' => 'Hypertensive since 2019',
        'social_functioning' => 'Actively participates in barangay activities',
        'assessment_notes' => 'Household income falls below the poverty threshold',
        'recommendation' => 'Full medicine subsidy for three months',
        'recommended_assistance' => 'Medicine',
        'recommended_amount' => 2500,
        'intervention_plan' => 'Refer to PCSO and enrol in the medicine assistance programme',
    ], $overrides));

    $assessment->expenses()->create(['expense_type' => 'food', 'amount' => 4000]);
    $assessment->expenses()->create(['expense_type' => 'utilities', 'amount' => 1500]);

    return $assessment;
}

it('renders every section of the report', function () {
    $scsr = makeScsrForPdf($this->case, $this->head);

    // Rendering the view rather than the PDF: DomPDF output is a binary blob,
    // so the HTML is where the content is actually assertable.
    $html = view('pdf.social-case-study', ['scsr' => $scsr->load([
        'case.patient.familyMembers', 'case.patient.sector', 'case.assignedUser', 'expenses', 'preparedBy', 'notedBy',
    ])])->render();

    expect($html)
        ->toContain('Social Case Study Report')
        ->toContain('SCSR-2026-000001')
        ->toContain('I. Identifying Data')
        ->toContain('II. Source and Reason for Referral')
        ->toContain('III. Problem Presented')
        ->toContain('IV. Family Composition and Background')
        ->toContain('V. Economic and Environmental Situation')
        ->toContain('VI. Health and Medical History')
        ->toContain('VII. Social Functioning')
        ->toContain('VIII. Assessment and Analysis')
        ->toContain('IX. Recommendation')
        ->toContain('X. Plan of Intervention')
        ->toContain('Reyes Ana')
        ->toContain('Endorsed by Ward 3')
        ->toContain('Hypertensive since 2019')
        ->toContain('Pedro Reyes')            // family grid
        ->toContain('Prepared by')
        ->toContain('Noted by');
});

it('prints peso amounts and the expense total', function () {
    $scsr = makeScsrForPdf($this->case, $this->head);

    $html = view('pdf.social-case-study', ['scsr' => $scsr->load(['case.patient.familyMembers', 'expenses'])])->render();

    // DejaVu Sans is required for ₱ — the styles partial is load-bearing here.
    expect($html)
        ->toContain('DejaVu Sans')
        ->toContain('₱ 12,000.00')   // total family income
        ->toContain('₱ 2,500.00')    // recommended amount
        ->toContain('₱ 5,500.00');   // expense total
});

it('watermarks a report that is not finalized and drops it once signed', function () {
    $scsr = makeScsrForPdf($this->case, $this->head);

    $draftHtml = view('pdf.social-case-study', ['scsr' => $scsr->load('expenses')])->render();
    expect($draftHtml)->toContain('watermark');

    $scsr->forceFill([
        'social_case_status' => Assessment::SOCIAL_CASE_FINALIZED,
        'noted_by' => $this->head->id, 'noted_at' => now(),
    ])->save();

    $finalHtml = view('pdf.social-case-study', ['scsr' => $scsr->refresh()->load(['expenses', 'notedBy'])])->render();
    expect($finalHtml)->not->toContain('class="watermark"')
        ->and($finalHtml)->toContain($this->head->employee_name);
});

it('names the archived file by control number and revision', function () {
    $scsr = makeScsrForPdf($this->case, $this->head, ['revision' => 3]);

    expect(app(SocialCaseStudyPdfService::class)->filename($scsr))->toBe('SCSR-2026-000001-r3.pdf');
});

it('streams the pdf and offers it as a download', function () {
    makeScsrForPdf($this->case, $this->head);

    Sanctum::actingAs($this->head);

    $response = $this->get("/api/cases/{$this->case->id}/social-case/pdf");
    $response->assertOk()->assertHeader('content-type', 'application/pdf');
    expect(substr($response->getContent(), 0, 4))->toBe('%PDF');

    $this->get("/api/cases/{$this->case->id}/social-case/pdf?download=1")
        ->assertOk()
        ->assertHeader('content-disposition', 'attachment; filename=SCSR-2026-000001-r1.pdf');
});

it('requires cases.view to print the report', function () {
    makeScsrForPdf($this->case, $this->head);

    Sanctum::actingAs(User::factory()->create());
    $this->get("/api/cases/{$this->case->id}/social-case/pdf")->assertForbidden();
});
