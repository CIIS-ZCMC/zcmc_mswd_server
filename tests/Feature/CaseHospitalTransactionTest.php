<?php

use App\Models\Bizbox\DataCenter;
use App\Models\Bizbox\HospitalPatient;
use App\Models\Bizbox\PatientGuarantors;
use App\Models\Bizbox\PatientPersonalData;
use App\Models\Bizbox\PatientTransaction;
use App\Models\CaseActivity;
use App\Models\CaseHospitalTransaction;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use App\Repositories\Contracts\PatientTransactionRepositoryInterface;
use App\Services\CaseHospitalTransactionService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->worker = User::factory()->create(['role' => 'MSS Head']);
    $this->worker->assignRole('MSS Head');
});

function chtUser(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function patientWithHospitalId(int $sectorId, ?int $hospitalId = 777): Patient
{
    return Patient::create([
        'sector_id' => $sectorId,
        'hospital_id' => $hospitalId,
        'first_name' => 'Ana',
        'last_name' => 'Reyes',
        'sex' => 'female',
    ]);
}

function caseForPatient(Patient $patient, User $worker): CaseModel
{
    return CaseModel::create([
        'patient_id' => $patient->id,
        'case_code' => 'CASE-'.fake()->unique()->numerify('######'),
        'case_type' => 'medical',
        'priority_level' => 'high',
        'admission_type' => 'ER',
        'status' => CaseModel::STATUS_OPEN,
        'assigned_user_id' => $worker->id,
        'date_opened' => now(),
    ]);
}

/** A HIS transaction fixture with patient + one guarantor (no sqlsrv). */
function chtHisTransaction(int $key = 9, int $patid = 777): PatientTransaction
{
    $hp = (new HospitalPatient)->forceFill(['PK_emdPatients' => 5, 'patid' => $patid]);

    $transaction = (new PatientTransaction)->forceFill([
        'PK_psPatRegisters' => $key,
        'FK_emdPatients' => 5,
        'registrystatus' => 'A',
        'registrydate' => '2026-09-14 08:30:00',
        'dischargeno' => 'D-1',
        'impression' => 'For observation',
    ]);
    $transaction->setRelation('patient', $hp);

    $account = (new DataCenter)->forceFill(['PK_psDatacenter' => 900]);
    $account->setRelation('personalData', (new PatientPersonalData)->forceFill([
        'firstname' => 'Maria', 'lastname' => 'Cruz',
    ]));
    $guarantor = (new PatientGuarantors)->forceFill(['PK_TRXNO' => 1, 'FK_faCustomers' => 900, 'amount' => 1500]);
    $guarantor->setRelation('guarantor', $account);
    $transaction->setRelation('guarantors', new Collection([$guarantor]));

    return $transaction;
}

function mockTransactionFind(PatientTransaction $transaction): void
{
    test()->mock(PatientTransactionRepositoryInterface::class, function ($mock) use ($transaction) {
        $mock->shouldReceive('find')->andReturn($transaction);
    });
}

it('attaches an encounter with a curated snapshot and logs a milestone', function () {
    mockTransactionFind(chtHisTransaction());
    $case = caseForPatient(patientWithHospitalId($this->sector->id), $this->worker);

    $link = app(CaseHospitalTransactionService::class)->attach($case, 9, $this->worker);

    expect(CaseHospitalTransaction::count())->toBe(1)
        ->and($link->his_transaction_id)->toBe(9)
        ->and($link->hospital_id)->toBe(777)
        ->and($link->snapshot['registration_status']['code'])->toBe('A')
        ->and($link->snapshot['registration_status']['label'])->toBe('Active')
        ->and($link->snapshot['guarantors'][0]['name'])->toBe('Cruz, Maria')
        ->and((float) $link->snapshot['guarantor_total'])->toBe(1500.0)
        ->and($link->snapshot['impression'])->toBe('For observation');

    expect(CaseActivity::where('case_id', $case->id)
        ->where('activity_type', 'hospital_transaction_linked')->exists())->toBeTrue();
});

it('is idempotent for the same case', function () {
    mockTransactionFind(chtHisTransaction());
    $case = caseForPatient(patientWithHospitalId($this->sector->id), $this->worker);
    $service = app(CaseHospitalTransactionService::class);

    $first = $service->attach($case, 9, $this->worker);
    $second = $service->attach($case, 9, $this->worker);

    expect(CaseHospitalTransaction::count())->toBe(1)
        ->and($second->id)->toBe($first->id);
});

it('rejects an encounter belonging to a different patient', function () {
    mockTransactionFind(chtHisTransaction(patid: 778)); // case patient is 777
    $case = caseForPatient(patientWithHospitalId($this->sector->id, 777), $this->worker);

    app(CaseHospitalTransactionService::class)->attach($case, 9, $this->worker);
})->throws(ValidationException::class);

it('rejects when the case patient is not linked to a hospital record', function () {
    mockTransactionFind(chtHisTransaction());
    $case = caseForPatient(patientWithHospitalId($this->sector->id, null), $this->worker);

    app(CaseHospitalTransactionService::class)->attach($case, 9, $this->worker);
})->throws(ValidationException::class);

it('rejects an encounter already attached to another case', function () {
    mockTransactionFind(chtHisTransaction());
    $service = app(CaseHospitalTransactionService::class);

    $patient = patientWithHospitalId($this->sector->id);
    $caseA = caseForPatient($patient, $this->worker);
    $caseB = caseForPatient($patient, $this->worker);

    $service->attach($caseA, 9, $this->worker);

    expect(fn () => $service->attach($caseB, 9, $this->worker))
        ->toThrow(ValidationException::class);
});

it('detaches an encounter and logs a milestone', function () {
    mockTransactionFind(chtHisTransaction());
    $case = caseForPatient(patientWithHospitalId($this->sector->id), $this->worker);
    $service = app(CaseHospitalTransactionService::class);

    $link = $service->attach($case, 9, $this->worker);
    $service->detach($link, $this->worker);

    expect(CaseHospitalTransaction::count())->toBe(0)
        ->and(CaseActivity::where('case_id', $case->id)
            ->where('activity_type', 'hospital_transaction_unlinked')->exists())->toBeTrue();
});

it('attaches, lists, live-reads and detaches through the API', function () {
    Sanctum::actingAs(chtUser());
    mockTransactionFind(chtHisTransaction());
    $case = caseForPatient(patientWithHospitalId($this->sector->id), $this->worker);

    $created = $this->postJson("/api/cases/{$case->id}/hospital-transactions", ['his_transaction_id' => 9])
        ->assertCreated()
        ->assertJsonPath('data.his_transaction_id', 9)
        ->assertJsonPath('data.snapshot.registration_status.code', 'A');

    $linkId = $created->json('data.id');

    $this->getJson("/api/cases/{$case->id}/hospital-transactions")
        ->assertOk()
        ->assertJsonCount(1, 'data');

    $this->getJson("/api/case-hospital-transactions/{$linkId}")
        ->assertOk()
        ->assertJsonPath('data.his_transaction_id', 9)
        ->assertJsonPath('live_transaction.id', 9);

    $this->deleteJson("/api/case-hospital-transactions/{$linkId}")->assertNoContent();

    expect(CaseHospitalTransaction::count())->toBe(0);
});

it('refuses to attach without cases.update', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'Social Worker'])); // no permissions
    $case = caseForPatient(patientWithHospitalId($this->sector->id), $this->worker);

    $this->postJson("/api/cases/{$case->id}/hospital-transactions", ['his_transaction_id' => 9])
        ->assertForbidden();
});

// ---- B.1: transaction-side assess ----

it('lists only the encounter patient\'s open cases as assignable', function () {
    mockTransactionFind(chtHisTransaction());
    $patient = patientWithHospitalId($this->sector->id);
    $open = caseForPatient($patient, $this->worker);
    $closed = caseForPatient($patient, $this->worker);
    $closed->update(['status' => CaseModel::STATUS_CLOSED]);

    $assignable = app(CaseHospitalTransactionService::class)
        ->assignableCasesFor(chtHisTransaction());

    expect($assignable->pluck('id')->all())->toBe([$open->id]);
});

it('returns an empty assignable list for a patient with no local record', function () {
    // Encounter patient number 999 has no local patient.
    $assignable = app(CaseHospitalTransactionService::class)
        ->assignableCasesFor(chtHisTransaction(patid: 999));

    expect($assignable)->toHaveCount(0);
});

it('lists assignable cases through the API', function () {
    Sanctum::actingAs(chtUser());
    mockTransactionFind(chtHisTransaction());
    $case = caseForPatient(patientWithHospitalId($this->sector->id), $this->worker);

    $this->getJson('/api/patient-transactions/9/cases')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $case->id);
});

it('assesses a transaction into a picked case through the API', function () {
    Sanctum::actingAs(chtUser());
    mockTransactionFind(chtHisTransaction());
    $case = caseForPatient(patientWithHospitalId($this->sector->id), $this->worker);

    $this->postJson('/api/patient-transactions/9/assess', ['case_id' => $case->id])
        ->assertCreated()
        ->assertJsonPath('data.his_transaction_id', 9)
        ->assertJsonPath('data.case_id', $case->id);

    expect(CaseHospitalTransaction::where('case_id', $case->id)->where('his_transaction_id', 9)->exists())
        ->toBeTrue();
});

it('rejects assessing into a case whose patient differs', function () {
    Sanctum::actingAs(chtUser());
    mockTransactionFind(chtHisTransaction(patid: 777));
    // Case belongs to a different hospital patient (778).
    $case = caseForPatient(patientWithHospitalId($this->sector->id, 778), $this->worker);

    $this->postJson('/api/patient-transactions/9/assess', ['case_id' => $case->id])
        ->assertStatus(422);

    expect(CaseHospitalTransaction::count())->toBe(0);
});

it('refuses to assess without cases.update', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'Social Worker'])); // no permissions
    $case = caseForPatient(patientWithHospitalId($this->sector->id), $this->worker);

    $this->postJson('/api/patient-transactions/9/assess', ['case_id' => $case->id])
        ->assertForbidden();
});
