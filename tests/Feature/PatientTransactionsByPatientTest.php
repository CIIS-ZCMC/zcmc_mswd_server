<?php

use App\Models\Bizbox\DataCenter;
use App\Models\Bizbox\HospitalPatient;
use App\Models\Bizbox\PatientGuarantors;
use App\Models\Bizbox\PatientPersonalData;
use App\Models\Bizbox\PatientTransaction;
use App\Repositories\Contracts\HospitalPatientRepositoryInterface;
use App\Repositories\Contracts\PatientTransactionRepositoryInterface;
use App\Services\PatientTransactionService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\QueryException;

/** A HIS patient whose surrogate key differs from its hospital number. */
function hisPatient(int $key = 5, int $patid = 777): HospitalPatient
{
    $personal = (new PatientPersonalData)->forceFill([
        'firstname' => 'Pedro', 'lastname' => 'Santos', 'middlename' => 'M',
    ]);

    $patient = (new HospitalPatient)->forceFill(['PK_emdPatients' => $key, 'patid' => $patid]);
    $patient->setRelation('personalData', $personal);

    return $patient;
}

function hisTransaction(int $key, int $patientKey): PatientTransaction
{
    $account = (new DataCenter)->forceFill(['PK_psDatacenter' => 900]);
    $account->setRelation('personalData', (new PatientPersonalData)->forceFill([
        'firstname' => 'Maria', 'lastname' => 'Cruz',
    ]));

    $guarantor = (new PatientGuarantors)->forceFill(['PK_TRXNO' => 1, 'FK_faCustomers' => 900]);
    $guarantor->setRelation('guarantor', $account);

    $transaction = (new PatientTransaction)->forceFill([
        'PK_psPatRegisters' => $key,
        'FK_emdPatients' => $patientKey,
        'registrydate' => '2026-09-14 08:30:00',
    ]);
    $transaction->setRelation('guarantors', new Collection([$guarantor]));

    return $transaction;
}

it('resolves a hospital number to the HIS key before fetching transactions', function () {
    // The bridge under test: hospital_id holds patid (777), but transactions
    // join on PK_emdPatients (5). Passing 777 straight through would miss.
    $this->mock(HospitalPatientRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('findByNameAndHospitalNumber')
            ->with(null, 777)
            ->andReturn(new Collection([hisPatient(key: 5, patid: 777)]));
    });

    $this->mock(PatientTransactionRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('getByPatientId')
            ->with(5)
            ->andReturn(new Collection([hisTransaction(9, 5), hisTransaction(8, 5)]));
    });

    $transactions = app(PatientTransactionService::class)->forHospitalNumber(777);

    expect($transactions)->toHaveCount(2)
        ->and($transactions->first()->getKey())->toBe(9)
        ->and($transactions->first()->guarantors->first()->guarantor->displayName())->toBe('Cruz, Maria');
});

it('returns nothing when the hospital number matches no HIS patient', function () {
    $this->mock(HospitalPatientRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('findByNameAndHospitalNumber')->andReturn(new Collection);
    });

    expect(app(PatientTransactionService::class)->forHospitalNumber(404))->toBeEmpty();
});

it('returns nothing for a patient with no hospital number, without touching the HIS', function () {
    $this->mock(HospitalPatientRepositoryInterface::class, function ($mock) {
        $mock->shouldNotReceive('findByNameAndHospitalNumber');
    });

    expect(app(PatientTransactionService::class)->forHospitalNumber(null))->toBeEmpty();
});

it('degrades to an empty collection when the HIS is unreachable', function () {
    // The regression that matters most: the HIS is down on every development
    // machine, and a patient page must not 500 because of it.
    $this->mock(HospitalPatientRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('findByNameAndHospitalNumber')
            ->andThrow(new QueryException('sqlsrv', 'select 1', [], new RuntimeException('server unreachable')));
    });

    expect(app(PatientTransactionService::class)->forHospitalNumber(777))->toBeEmpty();
});

it('passes a HIS key straight through on getByPatientId', function () {
    $this->mock(PatientTransactionRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('getByPatientId')->with(5)->andReturn(new Collection([hisTransaction(9, 5)]));
    });

    expect(app(PatientTransactionService::class)->getByPatientId(5))->toHaveCount(1);
});
