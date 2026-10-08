<?php

use App\Models\AcknowledgementSlipPrintLog;
use App\Models\AssistantType;
use App\Models\Bizbox\HospitalPatient;
use App\Models\Bizbox\PatientPersonalData;
use App\Models\Bizbox\PatientTransaction;
use App\Models\Patient;
use App\Models\PatientFamilyMember;
use App\Models\Sector;
use App\Models\User;
use App\Repositories\Contracts\PatientTransactionRepositoryInterface;
use App\Services\CityMayorSlipPdfService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->user = User::factory()->create([
        'role' => 'Processor', 'employee_name' => 'Mitchelle O. Sanico, RSW',
        'license_no' => '0016804', 'position' => 'Social Welfare Officer II',
    ]);
    $this->user->assignRole('Processor');

    $this->patient = Patient::create([
        'sector_id' => Sector::firstOrCreate(['code' => 'MED'], ['name' => 'Medical'])->id,
        'first_name' => 'Maria', 'middle_name' => 'S.', 'last_name' => 'Dela Cruz',
        'sex' => 'female', 'civil_status' => 'Single', 'birthdate' => '1980-02-02',
        'permanent_address' => 'San Jose Cawa-Cawa, Zamboanga City',
        'educational_attainment' => 'High School Level', 'religion' => 'Roman Catholic',
        'occupation' => 'Self-employed', 'monthly_income' => 8500,
        'hospital_id' => 1702854,
    ]);
    PatientFamilyMember::create(['patient_id' => $this->patient->id, 'name' => 'Jose Dela Cruz']);

    $this->xray = AssistantType::firstOrCreate(
        ['code' => 'xray_cm'], ['name' => 'X-ray/Ultrasound/2D Echo/CT Scan/MRI', 'category' => 'medical'],
    );
});

/** HIS encounter 9 for the patient with the given HIS patid (no ledger needed). */
function mockCityMayorEncounter(?string $diagnosis = 'Multiple myoma', int $patid = 1702854): void
{
    $hisPatient = (new HospitalPatient)->forceFill(['PK_emdPatients' => 5, 'patid' => $patid]);
    $hisPatient->setRelation('personalData', (new PatientPersonalData)->forceFill([
        'firstname' => 'Juana', 'lastname' => 'Cruz', 'gender' => 'Female', 'civilstatus' => 'W',
    ]));

    $encounter = (new PatientTransaction)->forceFill(['PK_psPatRegisters' => 9, 'finaldiagnosis' => $diagnosis]);
    $encounter->setRelation('patient', $hisPatient);

    test()->mock(PatientTransactionRepositoryInterface::class, function ($mock) use ($encounter) {
        $mock->shouldReceive('find')->andReturn($encounter);
    });
}

function cityMayorHtml(array $options = [], ?User $by = null): string
{
    $slips = app(CityMayorSlipPdfService::class);

    return $slips->render($slips->hisEncounter(9), $options, $by)->getDomPDF()->outputHtml();
}

it('streams the slip as a PDF and logs it as the city mayor form', function () {
    Sanctum::actingAs($this->user);
    mockCityMayorEncounter();

    $response = $this->get("/api/patient-transactions/9/city-mayor-slip/pdf?assistant_type_ids={$this->xray->id}&remarks=Billing")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');

    expect(substr($response->getContent(), 0, 4))->toBe('%PDF');

    $log = AcknowledgementSlipPrintLog::sole();
    expect($log->form)->toBe('city_mayor')
        ->and($log->his_transaction_id)->toBe(9)
        ->and($log->patient_id)->toBe($this->patient->id)
        ->and($log->patient_guarantee_id)->toBeNull()
        ->and($log->remarks)->toBe('Billing');
});

it('does not log a preview, and downloads with download=1', function () {
    Sanctum::actingAs($this->user);
    mockCityMayorEncounter();

    $this->get('/api/patient-transactions/9/city-mayor-slip/pdf?preview=1&download=1')
        ->assertOk()
        ->assertHeader('content-disposition', 'attachment; filename=CITY-MAYOR-SLIP-1702854-9.pdf');

    expect(AcknowledgementSlipPrintLog::count())->toBe(0);
});

it('fills the form from the registry patient, the encounter and the dialog picks', function () {
    mockCityMayorEncounter();

    $html = cityMayorHtml([
        'assistant_type_ids' => [$this->xray->id], 'fund' => 'city_grant', 'amount' => 1500,
        'time_started' => '17:20', 'time_ended' => '17:28',
    ], $this->user);

    expect($html)
        ->toContain('MARIA S. DELA CRUZ')
        ->toContain('HIGH SCHOOL LEVEL')
        ->toContain('02/02/1980')
        ->toContain('ROMAN CATHOLIC')
        ->toContain('SELF-EMPLOYED')
        ->toContain('8,500.00')
        ->toContain('>2<') // one family member + the patient
        ->toContain('MULTIPLE MYOMA')
        ->toContain('1,500.00')
        ->toContain('&#10003;</span>CITY GRANT IN AID')
        ->toContain('&#10003;</span><span class="picked">X-ray/Ultrasound/2D Echo/CT Scan/MRI')
        ->toContain('MITCHELLE O. SANICO, RSW')
        ->toContain('License No. 0016804')
        ->toContain('Social Welfare Officer II')
        ->toContain('1702854')
        ->toContain('N/A') // no MSWD #
        ->toContain('5:20 PM')
        ->toContain('5:28 PM')
        ->toContain('ZCMC-F-MSS-04');
});

it('ticks Others with its text, and leaves the amount blank when none is given', function () {
    mockCityMayorEncounter();

    $slip = app(CityMayorSlipPdfService::class)->slip(
        app(CityMayorSlipPdfService::class)->hisEncounter(9),
        ['fund' => 'others', 'fund_other' => 'Barangay'],
    );

    expect($slip)->toMatchArray(['fund' => 'others', 'fundOther' => 'BARANGAY', 'amount' => null, 'typeIds' => []]);
    expect(cityMayorHtml(['fund' => 'others', 'fund_other' => 'Barangay']))
        ->toContain('&#10003;</span>Others please specify')
        ->toContain('BARANGAY');
});

it('falls back to the HIS personal data for a patient not in the registry', function () {
    mockCityMayorEncounter(patid: 555);

    $slip = app(CityMayorSlipPdfService::class)->slip(app(CityMayorSlipPdfService::class)->hisEncounter(9));

    expect($slip)->toMatchArray([
        'name' => 'JUANA CRUZ', 'civilStatus' => 'WIDOWED', 'hospitalNumber' => 555,
        'members' => null, 'education' => '', 'mswdNumber' => 'N/A',
    ]);
});

it('validates the dialog picks', function (string $query, string $field) {
    Sanctum::actingAs($this->user);

    $this->getJson("/api/patient-transactions/9/city-mayor-slip/pdf?{$query}")
        ->assertJsonValidationErrors($field);
})->with([
    'unknown type' => ['assistant_type_ids=99999', 'assistant_type_ids.0'],
    'repeated type' => ['assistant_type_ids=1,1', 'assistant_type_ids.0'],
    'bad fund' => ['fund=mayor', 'fund'],
    'others without text' => ['fund=others', 'fund_other'],
    'negative amount' => ['amount=-1', 'amount'],
    'bad time' => ['time_started=25:00', 'time_started'],
]);

it('refuses a user without guarantee.view', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'Processor'])); // no role assigned

    $this->getJson('/api/patient-transactions/9/city-mayor-slip/pdf')->assertForbidden();
});

it('answers 503 when the HIS is unreachable', function () {
    Sanctum::actingAs($this->user);
    $this->mock(PatientTransactionRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('find')->andThrow(new QueryException('sqlsrv', 'select 1', [], new RuntimeException('down')));
    });

    $this->getJson('/api/patient-transactions/9/city-mayor-slip/pdf')
        ->assertStatus(503)
        ->assertJsonPath('code', 'his_unreachable');
});

it('fits on one page with a long diagnosis and every type listed', function () {
    mockCityMayorEncounter(str_repeat('CHRONIC ATROPHIC GASTRITIS; GASTRIC ATROPHY; ', 6));
    foreach (range(1, 8) as $i) {
        AssistantType::firstOrCreate(['code' => "type_{$i}"], ['name' => "Type {$i}", 'category' => 'medical']);
    }

    $slips = app(CityMayorSlipPdfService::class);
    $pdf = $slips->render($slips->hisEncounter(9), ['fund' => 'others', 'fund_other' => 'x', 'amount' => 1, 'time_started' => '10:00'], $this->user);
    $pdf->render();

    expect($pdf->getDomPDF()->getCanvas()->get_page_count())->toBe(1);
});

it('lists the Para sa types in the paper form order, Library additions last', function () {
    mockCityMayorEncounter();

    $types = array_values(app(CityMayorSlipPdfService::class)->slip(
        app(CityMayorSlipPdfService::class)->hisEncounter(9),
    )['types']);

    // The seeded types (AssistantTypeSeeder, via migration) in paper order, then xray_cm from beforeEach.
    expect(array_slice($types, 0, 4))->toBe(['Medicines', 'Laboratory', 'X-ray/Ultrasound/2D Echo/CT Scan/MRI', 'Hospital Bills'])
        ->and(end($types))->toBe('X-ray/Ultrasound/2D Echo/CT Scan/MRI');
});

it('ticks every type picked, through the comma-separated query', function () {
    Sanctum::actingAs($this->user);
    mockCityMayorEncounter();
    $lab = AssistantType::where('code', 'laboratory')->value('id');

    $html = cityMayorHtml(['assistant_type_ids' => [$lab, $this->xray->id]]);

    expect($html)
        ->toContain('&#10003;</span><span class="picked">Laboratory')
        ->toContain('&#10003;</span><span class="picked">X-ray/Ultrasound/2D Echo/CT Scan/MRI')
        ->not->toContain('&#10003;</span><span class="picked">Medicines');

    $this->get("/api/patient-transactions/9/city-mayor-slip/pdf?preview=1&assistant_type_ids={$lab},{$this->xray->id}")
        ->assertOk();
});

it('prints the patient as the signer (Pasyente/ Kinatawan ng Pasyente)', function () {
    mockCityMayorEncounter();

    expect(cityMayorHtml())->toMatch('/<div class="signame">MARIA S\. DELA CRUZ<\/div>\s*<div class="sigcap">Pasyente\/ Kinatawan ng Pasyente/');
});
