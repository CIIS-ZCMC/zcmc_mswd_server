<?php

use App\Models\AcknowledgementSlipPrintLog;
use App\Models\AssistantType;
use App\Models\Bizbox\HospitalPatient;
use App\Models\Bizbox\PatientPersonalData;
use App\Models\Bizbox\PatientTransaction;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\Signatory;
use App\Models\User;
use App\Repositories\Contracts\PatientTransactionRepositoryInterface;
use App\Services\IndigencyCertificatePdfService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->user = User::factory()->create(['role' => 'Processor']);
    $this->user->assignRole('Processor');

    $this->patient = Patient::create([
        'sector_id' => Sector::firstOrCreate(['code' => 'MED'], ['name' => 'Medical'])->id,
        'first_name' => 'Maria', 'middle_name' => 'S.', 'last_name' => 'Dela Cruz',
        'sex' => 'female', 'birthdate' => '1980-02-02',
        'permanent_address' => 'San Jose Cawa-Cawa, Zamboanga City',
        'hospital_id' => 1702854,
    ]);

    $this->laboratory = AssistantType::firstOrCreate(['code' => 'lab_ind'], ['name' => 'Laboratory', 'category' => 'medical']);
    $this->xray = AssistantType::firstOrCreate(['code' => 'xray_ind'], ['name' => 'X-Ray', 'category' => 'medical']);
});

/** HIS encounter 9 for the patient with the given HIS patid. */
function mockIndigencyEncounter(int $patid = 1702854): void
{
    $hisPatient = (new HospitalPatient)->forceFill(['PK_emdPatients' => 5, 'patid' => $patid]);
    $hisPatient->setRelation('personalData', (new PatientPersonalData)->forceFill([
        'firstname' => 'Juana', 'lastname' => 'Cruz', 'gender' => 'Female',
    ]));

    $encounter = (new PatientTransaction)->forceFill(['PK_psPatRegisters' => 9]);
    $encounter->setRelation('patient', $hisPatient);

    test()->mock(PatientTransactionRepositoryInterface::class, function ($mock) use ($encounter) {
        $mock->shouldReceive('find')->andReturn($encounter);
    });
}

function indigencyCertificate(array $options = []): array
{
    $certificates = app(IndigencyCertificatePdfService::class);

    return $certificates->certificate($certificates->hisEncounter(9), $options);
}

function indigencyHtml(array $options = []): string
{
    $certificates = app(IndigencyCertificatePdfService::class);

    return $certificates->render($certificates->hisEncounter(9), $options)->getDomPDF()->outputHtml();
}

it('streams the certificate as a PDF and logs it as the indigency form', function () {
    Sanctum::actingAs($this->user);
    mockIndigencyEncounter();

    $response = $this->get("/api/patient-transactions/9/indigency-certificate/pdf?classification=D&assistant_type_ids={$this->laboratory->id}&remarks=Malasakit")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');

    expect(substr($response->getContent(), 0, 4))->toBe('%PDF');

    $log = AcknowledgementSlipPrintLog::sole();
    expect($log->form)->toBe('indigency')
        ->and($log->his_transaction_id)->toBe(9)
        ->and($log->patient_id)->toBe($this->patient->id)
        ->and($log->printed_by)->toBe($this->user->id)
        ->and($log->remarks)->toBe('Malasakit');
});

it('does not log a preview, and downloads with download=1', function () {
    Sanctum::actingAs($this->user);
    mockIndigencyEncounter();

    $this->get('/api/patient-transactions/9/indigency-certificate/pdf?preview=1&download=1')
        ->assertOk()
        ->assertHeader('content-disposition', 'attachment; filename=INDIGENCY-CERT-1702854-9.pdf');

    expect(AcknowledgementSlipPrintLog::count())->toBe(0);
});

it('fills the certificate from the registry patient, the dialog picks and the MSWD Head', function () {
    Carbon::setTestNow('2026-01-06 09:00');
    mockIndigencyEncounter();

    $html = indigencyHtml([
        'classification' => 'D',
        'assistant_type_ids' => [$this->laboratory->id, $this->xray->id],
    ]);

    expect($html)
        ->toContain('ANNEX A')
        ->toContain('CERTIFICATE OF ELIGIBILITY (INDIGENCY)')
        ->toContain('MARIA S. DELA CRUZ')
        ->toContain('SAN JOSE CAWA-CAWA, ZAMBOANGA CITY')
        ->toContain('D-Financially Incapable')
        ->toContain('LABORATORY/X-RAY')
        ->toContain('ZAMBOANGA CITY MEDICAL CENTER')
        ->toContain('6-Jan-26')
        // Seeded by the migration: the MSWD Head when the form was added.
        ->toContain('CRISELDA A. PALOMO, RSW')
        ->toContain('0010989');
});

it('prints the services in the order picked', function () {
    mockIndigencyEncounter();

    expect(indigencyCertificate(['assistant_type_ids' => [$this->xray->id, $this->laboratory->id]])['services'])
        ->toBe('X-RAY/LABORATORY');
});

it('leaves the classification, services and signer blank for handwriting', function () {
    Signatory::query()->where('role', 'mswd_head')->delete();
    mockIndigencyEncounter();

    expect(indigencyCertificate())->toMatchArray([
        'classification' => null, 'services' => null, 'signerName' => null, 'signerLicense' => null,
    ]);
});

it('prints the active MSWD Head from the Library', function () {
    Signatory::query()->where('role', 'mswd_head')->update(['is_active' => false]);
    Signatory::create(['name' => 'Ana B. Reyes, RSW', 'license_no' => '0020000', 'role' => 'mswd_head', 'is_active' => true]);
    mockIndigencyEncounter();

    expect(indigencyCertificate())->toMatchArray(['signerName' => 'ANA B. REYES, RSW', 'signerLicense' => '0020000']);
});

it('falls back to the HIS personal data for a patient not in the registry', function () {
    mockIndigencyEncounter(patid: 555);

    expect(indigencyCertificate())->toMatchArray(['name' => 'JUANA CRUZ']);
});

it('validates the dialog picks', function (string $query, string $field) {
    Sanctum::actingAs($this->user);

    $this->getJson("/api/patient-transactions/9/indigency-certificate/pdf?{$query}")
        ->assertJsonValidationErrors($field);
})->with([
    'unknown type' => ['assistant_type_ids=99999', 'assistant_type_ids.0'],
    'repeated type' => ['assistant_type_ids=1,1', 'assistant_type_ids.0'],
    'bad classification' => ['classification=Z', 'classification'],
]);

it('refuses a user without guarantee.view', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'Processor'])); // no role assigned

    $this->getJson('/api/patient-transactions/9/indigency-certificate/pdf')->assertForbidden();
});

it('answers 503 when the HIS is unreachable', function () {
    Sanctum::actingAs($this->user);
    $this->mock(PatientTransactionRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('find')->andThrow(new QueryException('sqlsrv', 'select 1', [], new RuntimeException('down')));
    });

    $this->getJson('/api/patient-transactions/9/indigency-certificate/pdf')
        ->assertStatus(503)
        ->assertJsonPath('code', 'his_unreachable');
});

it('fits on one page with a long address and many services', function () {
    $this->patient->update(['permanent_address' => str_repeat('Purok Malinis, Barangay Sta. Maria, ', 4)]);
    $ids = collect(range(1, 8))
        ->map(fn ($i) => AssistantType::firstOrCreate(['code' => "ind_{$i}"], ['name' => "Diagnostic Service {$i}", 'category' => 'medical'])->id)
        ->all();
    mockIndigencyEncounter();

    $certificates = app(IndigencyCertificatePdfService::class);
    $pdf = $certificates->render($certificates->hisEncounter(9), ['classification' => 'C3', 'assistant_type_ids' => $ids]);
    $pdf->render();

    expect($pdf->getDomPDF()->getCanvas()->get_page_count())->toBe(1);
});
