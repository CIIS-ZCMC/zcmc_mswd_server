<?php

use App\Models\AcknowledgementSlipPrintLog;
use App\Models\AssistantType;
use App\Models\Bizbox\DataCenter;
use App\Models\Bizbox\HospitalPatient;
use App\Models\Bizbox\PatientGuarantors;
use App\Models\Bizbox\PatientPersonalData;
use App\Models\Bizbox\PatientTransaction;
use App\Models\CaseHospitalTransaction;
use App\Models\CaseModel;
use App\Models\Guarantor;
use App\Models\Patient;
use App\Models\PatientGuarantee;
use App\Models\Sector;
use App\Models\ServiceVisit;
use App\Models\Signatory;
use App\Models\User;
use App\Repositories\Contracts\PatientTransactionRepositoryInterface;
use App\Services\AcknowledgementSlipPdfService;
use Database\Seeders\GuarantorSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->seed(GuarantorSeeder::class);

    $this->user = User::factory()->create(['role' => 'Processor', 'employee_name' => 'Maria Worker']);
    $this->user->assignRole('Processor');

    $this->patient = Patient::create([
        'sector_id' => Sector::firstOrCreate(['code' => 'MED'], ['name' => 'Medical'])->id,
        'first_name' => 'Nanang', 'middle_name' => 'P.', 'last_name' => 'Tayani',
        'sex' => 'female', 'civil_status' => 'Married', 'birthdate' => '1949-05-01',
        'permanent_address' => 'Brgy. Tetuan, Zamboanga City',
        'hospital_id' => 1687271, 'mswd_id' => '20260001',
    ]);

    $this->guarantee = slipGuarantee($this->patient, 'MAIFIP', [
        ['Laboratory', 'laboratory', 800],
        ['X-ray', 'xray', 529.60],
    ]);
});

/**
 * A guarantee on HIS encounter 9 with one breakdown line per [type name, code, amount].
 *
 * @param  list<array{0: string, 1: string, 2: float|int}>  $lines
 */
function slipGuarantee(Patient $patient, string $guarantor, array $lines): PatientGuarantee
{
    $guarantee = PatientGuarantee::create([
        'patient_id' => $patient->id,
        'his_transaction_id' => 9,
        'hospital_id' => $patient->hospital_id,
        'guarantor_id' => Guarantor::firstOrCreate(['name' => $guarantor])->id,
        'guaranteed_on' => '2026-01-06',
        'recorded_by' => User::query()->value('id'),
    ]);

    foreach ($lines as [$name, $code, $amount]) {
        $type = AssistantType::firstOrCreate(['code' => $code], ['name' => $name, 'category' => 'medical']);
        $guarantee->items()->create(['assistant_type_id' => $type->id, 'amount' => $amount]);
    }

    return $guarantee;
}

function mockEncounter(?string $finalDiagnosis = 'Cataract senile mature', ?string $impression = null): void
{
    test()->mock(PatientTransactionRepositoryInterface::class, function ($mock) use ($finalDiagnosis, $impression) {
        $mock->shouldReceive('find')->andReturn((new PatientTransaction)->forceFill([
            'PK_psPatRegisters' => 9, 'finaldiagnosis' => $finalDiagnosis, 'impression' => $impression,
        ]));
    });
}

function slipHtml(PatientGuarantee $guarantee, ?User $by = null, ?string $start = null, ?string $end = null): string
{
    return app(AcknowledgementSlipPdfService::class)
        ->render($guarantee, $by, $start, $end)
        ->getDomPDF()->outputHtml();
}

it('streams the slip as a PDF and logs the print', function () {
    Sanctum::actingAs($this->user);
    mockEncounter();

    $response = $this->get("/api/guarantees/{$this->guarantee->id}/acknowledgement-slip/pdf?copies=2&remarks=Billing copy")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');

    expect(substr($response->getContent(), 0, 4))->toBe('%PDF');

    $log = AcknowledgementSlipPrintLog::sole();
    expect($log->patient_guarantee_id)->toBe($this->guarantee->id)
        ->and($log->his_transaction_id)->toBe(9)
        ->and($log->copies)->toBe(2)
        ->and($log->remarks)->toBe('Billing copy')
        ->and($log->printed_by)->toBe($this->user->id);
});

it('does not log a preview', function () {
    Sanctum::actingAs($this->user);
    mockEncounter();

    $this->get("/api/guarantees/{$this->guarantee->id}/acknowledgement-slip/pdf?preview=1")->assertOk();

    expect(AcknowledgementSlipPrintLog::count())->toBe(0);
});

it('downloads with download=1', function () {
    Sanctum::actingAs($this->user);
    mockEncounter();

    $this->get("/api/guarantees/{$this->guarantee->id}/acknowledgement-slip/pdf?download=1&preview=1")
        ->assertOk()
        ->assertHeader('content-disposition', 'attachment; filename=ACK-SLIP-20260001-'.$this->guarantee->id.'.pdf');
});

it('refuses a guarantee that is not MAIFIP', function () {
    Sanctum::actingAs($this->user);
    $pcso = slipGuarantee($this->patient, 'PCSO', [['Medicines', 'medicines', 500]]);

    $this->getJson("/api/guarantees/{$pcso->id}/acknowledgement-slip/pdf")
        ->assertUnprocessable()
        ->assertJsonPath('code', 'not_maifip');
});

it('validates copies and times', function (string $query, string $field) {
    Sanctum::actingAs($this->user);

    $this->getJson("/api/guarantees/{$this->guarantee->id}/acknowledgement-slip/pdf?{$query}")
        ->assertJsonValidationErrors($field);
})->with([
    'no copies' => ['copies=0', 'copies'],
    'too many copies' => ['copies=99', 'copies'],
    'bad start' => ['time_started=25:99', 'time_started'],
    'bad end' => ['time_ended=10am', 'time_ended'],
    'unknown fund' => ['fund=mayor', 'fund'],
    'negative amount' => ['amount=-1', 'amount'],
]);

it('refuses a user without guarantee.view', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'Processor'])); // no role assigned

    $this->getJson("/api/guarantees/{$this->guarantee->id}/acknowledgement-slip/pdf")->assertForbidden();
});

it('fills the form from the patient, the guarantee and the HIS encounter', function () {
    mockEncounter();

    $html = slipHtml($this->guarantee, $this->user, '10:49', '10:55');

    expect($html)
        ->toContain('NANANG P. TAYANI')
        ->toContain('>76<')
        ->toContain('FEMALE')
        ->toContain('MARRIED')
        ->toContain('BRGY. TETUAN, ZAMBOANGA CITY')
        ->toContain('CATARACT SENILE MATURE')
        ->toContain('1,329.60')
        ->toContain('LABORATORY/X-RAY')
        ->toContain('6-Jan-26')
        ->toContain('Maria Worker')
        ->toContain('1687271')
        ->toContain('20260001')
        ->toContain('10:49 AM')
        ->toContain('10:55 AM')
        ->toContain('ZCMC-F-MSWD-46')
        // DOH-MAIFIP ticked; the other two boxes empty.
        ->toContain('&#10003;</span> <b>DOH-MAIFIP')
        ->toContain('&nbsp;</span> <b>OPAV-SOCIO CIVID FUND');
});

it('prints the active approver from the Library', function () {
    mockEncounter();

    expect(slipHtml($this->guarantee))
        ->toContain('DR. JAIME KRISTOFFER T. PUNZALAN, MPH')
        ->toContain('OIC DESIGNATE - CHIEF OF ALLIED HEALTH');

    Signatory::query()->update(['is_active' => false]);
    Signatory::create(['name' => 'DR. NEW CHIEF', 'title' => 'Chief, AHPS', 'role' => 'allied_health_chief']);

    expect(slipHtml($this->guarantee))
        ->toContain('DR. NEW CHIEF')
        ->not->toContain('PUNZALAN');
});

it('falls back to the impression when there is no final diagnosis', function () {
    mockEncounter(null, 'Pneumonia');

    expect(slipHtml($this->guarantee))->toContain('PNEUMONIA');
});

it('falls back to the case link snapshot when the HIS is unreachable', function () {
    $this->mock(PatientTransactionRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('find')->andThrow(new QueryException('sqlsrv', 'select 1', [], new RuntimeException('down')));
    });

    $case = CaseModel::create([
        'patient_id' => $this->patient->id, 'assigned_user_id' => $this->user->id,
        'case_code' => 'CASE-ACK-1', 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'OPD', 'date_opened' => now(),
    ]);
    CaseHospitalTransaction::create([
        'case_id' => $case->id, 'his_transaction_id' => 9, 'hospital_id' => 1687271,
        'snapshot' => ['final_diagnosis' => 'Glaucoma'], 'linked_by' => $this->user->id, 'linked_at' => now(),
    ]);

    expect(slipHtml($this->guarantee))->toContain('GLAUCOMA');
});

it('fits on exactly one page', function () {
    mockEncounter();

    $pdf = app(AcknowledgementSlipPdfService::class)->render($this->guarantee, $this->user, '10:49', '10:55');
    $pdf->render();

    expect($pdf->getDomPDF()->getCanvas()->get_page_count())->toBe(1);
});

// ---- From the HIS guarantor ledger (no MSWD guarantee recorded) --------------------

/**
 * HIS encounter 9 for the patient (patid 1687271) with ledger rows given as
 * [PK_TRXNO, guarantor name, amount].
 *
 * @param  list<array{0: int, 1: string, 2: float|int}>  $ledger
 */
function mockHisEncounter(array $ledger, ?string $diagnosis = 'Cataract senile mature', int $patid = 1687271): void
{
    $personal = (new PatientPersonalData)->forceFill([
        'firstname' => 'Juana', 'lastname' => 'Cruz', 'gender' => 'Female', 'civilstatus' => 'W',
        'birthdate' => '1960-01-01 00:00:00',
    ]);
    $hisPatient = (new HospitalPatient)->forceFill(['PK_emdPatients' => 5, 'patid' => $patid]);
    $hisPatient->setRelation('personalData', $personal);

    $rows = array_map(function (array $row) {
        [$key, $name, $amount] = $row;
        $entry = (new PatientGuarantors)->forceFill([
            'PK_TRXNO' => $key, 'FK_psPatRegisters' => 9, 'amount' => $amount, 'postdate' => '2026-09-21 16:12:00',
        ]);
        $entry->setRelation('guarantor', (new DataCenter)->forceFill(['fullname' => $name]));

        return $entry;
    }, $ledger);

    $encounter = (new PatientTransaction)->forceFill(['PK_psPatRegisters' => 9, 'finaldiagnosis' => $diagnosis]);
    $encounter->setRelation('patient', $hisPatient);
    $encounter->setRelation('guarantors', new Collection($rows));

    test()->mock(PatientTransactionRepositoryInterface::class, function ($mock) use ($encounter) {
        $mock->shouldReceive('find')->andReturn($encounter);
    });
}

it('prints from the HIS MAIFIP ledger entry and logs it', function () {
    Sanctum::actingAs($this->user);
    mockHisEncounter([[71, 'PCSO', 500], [72, 'MAIFIP', 1329.6]]);

    $response = $this->get('/api/patient-transactions/9/acknowledgement-slip/pdf')
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');

    expect(substr($response->getContent(), 0, 4))->toBe('%PDF');

    $log = AcknowledgementSlipPrintLog::sole();
    expect($log->his_guarantor_entry_id)->toBe(72)
        ->and($log->patient_guarantee_id)->toBeNull()
        ->and($log->patient_id)->toBe($this->patient->id)
        ->and($log->his_transaction_id)->toBe(9);
});

it('fills a HIS slip from the registry patient, the HIS amount and post date', function () {
    mockHisEncounter([[72, 'MAIFIP', 1329.6]]);
    $slips = app(AcknowledgementSlipPdfService::class);
    $encounter = $slips->hisEncounter(9);

    $slip = $slips->slipFromHis($encounter, $slips->hisMaifipEntries($encounter)->first(), $this->user);

    expect($slip)->toMatchArray([
        'name' => 'NANANG P. TAYANI', // the registry record, not the HIS name
        'amount' => '1,329.60',
        'purpose' => '', // HIS has no types of assistance: left for handwriting
        'date' => '21-Sep-26',
        'diagnosis' => 'CATARACT SENILE MATURE',
        'mswdNumber' => '20260001',
    ]);
});

it('uses the HIS personal data for a patient not in the registry', function () {
    mockHisEncounter([[72, 'MAIFIP', 500]], patid: 555);
    $slips = app(AcknowledgementSlipPdfService::class);
    $encounter = $slips->hisEncounter(9);

    $slip = $slips->slipFromHis($encounter, $slips->hisMaifipEntries($encounter)->first());

    expect($slip)->toMatchArray([
        'name' => 'JUANA CRUZ', 'sex' => 'FEMALE', 'civilStatus' => 'WIDOWED',
        'hospitalNumber' => 555, 'mswdNumber' => null,
    ]);
});

it('picks the ledger entry named by ?entry', function () {
    Sanctum::actingAs($this->user);
    mockHisEncounter([[72, 'MAIFIP', 100], [73, 'DOH-MAIFIP', 200]]);

    $this->get('/api/patient-transactions/9/acknowledgement-slip/pdf?entry=73')->assertOk();

    expect(AcknowledgementSlipPrintLog::sole()->his_guarantor_entry_id)->toBe(73);
});

it('allows printing an encounter with no HIS MAIFIP entry and logs it', function () {
    Sanctum::actingAs($this->user);
    mockHisEncounter([[71, 'PCSO', 500]]);

    $response = $this->get('/api/patient-transactions/9/acknowledgement-slip/pdf?fund=opav_socio_civid_fund&amount=500')
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');

    expect(substr($response->getContent(), 0, 4))->toBe('%PDF');

    $log = AcknowledgementSlipPrintLog::sole();
    expect($log->patient_id)->toBe($this->patient->id)
        ->and($log->his_transaction_id)->toBe(9)
        ->and($log->his_guarantor_entry_id)->toBeNull();
});

it('prints an encounter slip with the picked fund and blank lines for handwriting', function () {
    mockHisEncounter([]);
    $slips = app(AcknowledgementSlipPdfService::class);
    $encounter = $slips->hisEncounter(9);

    expect($slips->slipFromEncounter($encounter, fund: 'others', fundOther: 'Barangay'))
        ->toMatchArray(['amount' => '', 'purpose' => '', 'fund' => 'others', 'fundOther' => 'BARANGAY'])
        ->and($slips->slipFromEncounter($encounter, amount: 500, fund: 'opav_socio_civid_fund'))
        ->toMatchArray(['amount' => '500.00', 'fund' => 'opav_socio_civid_fund', 'fundOther' => null])
        ->and($slips->filenameFromEncounter($encounter))->toBe('ACK-SLIP-1687271-ENC-9.pdf');

    $html = $slips->renderFromEncounter($encounter, fund: 'opav_socio_civid_fund')->getDomPDF()->outputHtml();
    expect($html)
        ->toContain('&nbsp;</span> <b>DOH-MAIFIP')
        ->toContain('&#10003;</span> <b>OPAV-SOCIO CIVID FUND');
});

it('answers 503 when the HIS is unreachable', function () {
    Sanctum::actingAs($this->user);
    $this->mock(PatientTransactionRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('find')->andThrow(new QueryException('sqlsrv', 'select 1', [], new RuntimeException('down')));
    });

    $this->getJson('/api/patient-transactions/9/acknowledgement-slip/pdf')
        ->assertStatus(503)
        ->assertJsonPath('code', 'his_unreachable');
});

it('keeps a long HIS diagnosis on one page', function () {
    mockHisEncounter([[72, 'MAIFIP', 500]], diagnosis: str_repeat('CHRONIC ATROPHIC GASTRITIS; GASTRIC ATROPHY; ', 6));
    $slips = app(AcknowledgementSlipPdfService::class);
    $encounter = $slips->hisEncounter(9);

    $pdf = $slips->renderFromHis($encounter, $slips->hisMaifipEntries($encounter)->first(), $this->user, '10:49', '10:55');
    $pdf->render();

    expect($pdf->getDomPDF()->getCanvas()->get_page_count())->toBe(1);
});

it('prints the types picked at print time on a HIS slip, in the order picked', function () {
    Sanctum::actingAs($this->user);
    mockHisEncounter([[72, 'MAIFIP', 1329.6]]);
    $lab = AssistantType::where('code', 'laboratory')->value('id');
    $xray = AssistantType::where('code', 'xray')->value('id');

    $slips = app(AcknowledgementSlipPdfService::class);
    $encounter = $slips->hisEncounter(9);
    $slip = $slips->slipFromHis($encounter, $slips->hisMaifipEntries($encounter)->first(), assistantTypeIds: [$lab, $xray]);

    expect($slip['purpose'])->toBe('LABORATORY/X-RAY');

    // Through the endpoint: the comma-separated query is split and validated.
    $this->get("/api/patient-transactions/9/acknowledgement-slip/pdf?preview=1&assistant_type_ids={$xray},{$lab}")
        ->assertOk();
});

it('rejects an unknown type of assistance', function () {
    Sanctum::actingAs($this->user);

    $this->getJson('/api/patient-transactions/9/acknowledgement-slip/pdf?assistant_type_ids=99999')
        ->assertJsonValidationErrors('assistant_type_ids.0');
});

// ── Time started / ended from the queue's turnaround ─────────────────────────

/** A visit on encounter 9: arrived 10:30, service started 10:49 and completed 10:55. */
function slipServiceVisit(Patient $patient, array $attributes = []): ServiceVisit
{
    return ServiceVisit::create([
        'patient_id' => $patient->id, 'his_transaction_id' => 9,
        'status' => ServiceVisit::STATUS_COMPLETED,
        'arrived_at' => '2026-10-19 10:30:00', 'started_at' => '2026-10-19 10:49:00',
        'completed_at' => '2026-10-19 10:55:00', 'received_by' => User::query()->value('id'),
        ...$attributes,
    ]);
}

it('prints the queue start and completion when no times are typed', function () {
    mockHisEncounter([[72, 'MAIFIP', 500]]);
    slipServiceVisit($this->patient);
    $slips = app(AcknowledgementSlipPdfService::class);
    $encounter = $slips->hisEncounter(9);

    $times = ['timeStarted' => '10:49 AM', 'timeEnded' => '10:55 AM'];

    expect($slips->slip($this->guarantee))->toMatchArray($times)
        ->and($slips->slipFromHis($encounter, $slips->hisMaifipEntries($encounter)->first()))->toMatchArray($times)
        ->and($slips->slipFromEncounter($encounter))->toMatchArray($times);
});

it('prints typed times over the queue, filling only the blank one', function () {
    mockHisEncounter([]);
    slipServiceVisit($this->patient);
    $slips = app(AcknowledgementSlipPdfService::class);

    expect($slips->slipFromEncounter($slips->hisEncounter(9), timeStarted: '11:00'))
        ->toMatchArray(['timeStarted' => '11:00 AM', 'timeEnded' => '10:55 AM']);
});

it('uses the latest served visit and leaves the end blank while in progress', function () {
    slipServiceVisit($this->patient);
    slipServiceVisit($this->patient, [
        'status' => ServiceVisit::STATUS_IN_PROGRESS, 'arrived_at' => '2026-10-19 13:00:00',
        'started_at' => '2026-10-19 13:20:00', 'completed_at' => null,
    ]);

    expect(app(AcknowledgementSlipPdfService::class)->slip($this->guarantee))
        ->toMatchArray(['timeStarted' => '1:20 PM', 'timeEnded' => null]);
});

it('leaves the times blank without a served visit on the encounter', function () {
    slipServiceVisit($this->patient, [
        'status' => ServiceVisit::STATUS_CANCELLED, 'completed_at' => null, 'cancelled_at' => '2026-10-19 11:00:00',
    ]);
    slipServiceVisit($this->patient, [
        'status' => ServiceVisit::STATUS_WAITING, 'arrived_at' => '2026-10-19 13:00:00',
        'started_at' => null, 'completed_at' => null,
    ]);
    slipServiceVisit($this->patient, ['his_transaction_id' => 10]); // another encounter

    expect(app(AcknowledgementSlipPdfService::class)->slip($this->guarantee))
        ->toMatchArray(['timeStarted' => null, 'timeEnded' => null]);
});
