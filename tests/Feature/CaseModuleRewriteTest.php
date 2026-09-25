<?php

use App\Enums\CardColor;
use App\Models\Bizbox\HospitalCaseType;
use App\Models\Bizbox\HospitalPatient;
use App\Models\Bizbox\PatientTransaction;
use App\Models\Bizbox\TransactionType;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use App\Repositories\Contracts\PatientTransactionRepositoryInterface;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id, 'hospital_id' => 777,
        'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
});

function cmrUser(string $role = 'Case Manager'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

/**
 * A HIS transaction fixture carrying the two lookups the case snapshot reads,
 * each with a `description` label. No sqlsrv connection is touched — the
 * repository's find() is mocked to return this.
 */
function cmrHisTransaction(
    int $key = 42,
    int $patid = 777,
    ?string $admissionLabel = 'Inpatient',
    ?string $transactionLabel = 'New Admission',
): PatientTransaction {
    $hp = (new HospitalPatient)->forceFill(['PK_emdPatients' => 5, 'patid' => $patid]);

    $transaction = (new PatientTransaction)->forceFill([
        'PK_psPatRegisters' => $key,
        'FK_emdPatients' => 5,
        'registrystatus' => 'A',
        'registrydate' => '2026-09-14 08:30:00',
    ]);
    $transaction->setRelation('patient', $hp);
    $transaction->setRelation('caseType', $admissionLabel === null ? null
        : (new HospitalCaseType)->forceFill(['PK_mscHospCaseTypes' => 3, 'description' => $admissionLabel]));
    $transaction->setRelation('transactionType', $transactionLabel === null ? null
        : (new TransactionType)->forceFill(['PK_mscHospTranTypes' => 8, 'description' => $transactionLabel]));

    return $transaction;
}

function cmrMockFind(PatientTransaction $transaction): void
{
    test()->mock(PatientTransactionRepositoryInterface::class, function ($mock) use ($transaction) {
        $mock->shouldReceive('find')->andReturn($transaction);
    });
}

it('defaults created_by to the opener and card_color to white', function () {
    $worker = cmrUser();
    Sanctum::actingAs($worker);

    $this->postJson('/api/cases', [
        'patient_id' => $this->patient->id,
        'case_type' => 'medical',
        'priority_level' => 'high',
        'admission_type' => 'ER',
    ])
        ->assertCreated()
        ->assertJsonPath('data.created_by', $worker->id)
        ->assertJsonPath('data.assigned_user_id', $worker->id)
        ->assertJsonPath('data.card_color', 'white');
});

it('keeps created_by fixed when the case is reassigned', function () {
    $worker = cmrUser('MSS Head');
    Sanctum::actingAs($worker);
    $case = app(App\Services\CaseModelService::class)->create(
        App\DTOs\CaseModelDto::fromArray([
            'patient_id' => $this->patient->id, 'case_type' => 'medical',
            'priority_level' => 'high', 'admission_type' => 'ER',
        ]),
        $worker,
    );
    $other = cmrUser('Case Manager');

    $this->postJson("/api/cases/{$case->id}/assign", ['assigned_user_id' => $other->id])
        ->assertOk()
        ->assertJsonPath('data.assigned_user_id', $other->id);

    expect($case->fresh()->created_by)->toBe($worker->id);
});

it('snapshots admission_type and transaction_type from the encounter when omitted', function () {
    cmrMockFind(cmrHisTransaction());
    $worker = cmrUser();
    Sanctum::actingAs($worker);

    $this->postJson('/api/cases', [
        'patient_id' => $this->patient->id,
        'case_type' => 'medical',
        'priority_level' => 'high',
        'transaction_id' => 42,
        // admission_type omitted — required_without:transaction_id
    ])
        ->assertCreated()
        ->assertJsonPath('data.transaction_id', 42)
        ->assertJsonPath('data.admission_type', 'Inpatient')
        ->assertJsonPath('data.transaction_type', 'New Admission');
});

it('does not overwrite an explicit admission_type or transaction_type', function () {
    cmrMockFind(cmrHisTransaction());
    $worker = cmrUser();
    Sanctum::actingAs($worker);

    $this->postJson('/api/cases', [
        'patient_id' => $this->patient->id,
        'case_type' => 'medical',
        'priority_level' => 'high',
        'admission_type' => 'ER',
        'transaction_type' => 'Manual override',
        'transaction_id' => 42,
    ])
        ->assertCreated()
        ->assertJsonPath('data.admission_type', 'ER')
        ->assertJsonPath('data.transaction_type', 'Manual override');
});

it('leaves the snapshot fields empty when the encounter has no lookups', function () {
    cmrMockFind(cmrHisTransaction(admissionLabel: null, transactionLabel: null));
    $worker = cmrUser();
    Sanctum::actingAs($worker);

    // caseType/transactionType relations are null → no label, no id either;
    // admission_type stays unset, so it must be provided to satisfy validation.
    $this->postJson('/api/cases', [
        'patient_id' => $this->patient->id,
        'case_type' => 'medical',
        'priority_level' => 'high',
        'admission_type' => 'ER',
        'transaction_id' => 42,
    ])
        ->assertCreated()
        ->assertJsonPath('data.admission_type', 'ER')
        ->assertJsonPath('data.transaction_type', null);
});

it('rejects opening a second case for the same encounter', function () {
    cmrMockFind(cmrHisTransaction());
    $worker = cmrUser();
    Sanctum::actingAs($worker);

    $payload = [
        'patient_id' => $this->patient->id,
        'case_type' => 'medical',
        'priority_level' => 'high',
        'transaction_id' => 42,
    ];

    $this->postJson('/api/cases', $payload)->assertCreated();
    $this->postJson('/api/cases', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('transaction_id');

    expect(CaseModel::where('transaction_id', 42)->count())->toBe(1);
});

it('rejects a card_color outside the enum', function () {
    $worker = cmrUser();
    Sanctum::actingAs($worker);

    $this->postJson('/api/cases', [
        'patient_id' => $this->patient->id,
        'case_type' => 'medical',
        'priority_level' => 'high',
        'admission_type' => 'ER',
        'card_color' => 'red',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('card_color');
});

it('accepts each valid card colour', function () {
    $worker = cmrUser();
    Sanctum::actingAs($worker);

    foreach (CardColor::values() as $color) {
        $this->postJson('/api/cases', [
            'patient_id' => $this->patient->id,
            'case_type' => 'medical',
            'priority_level' => 'high',
            'admission_type' => 'ER',
            'card_color' => $color,
        ])
            ->assertCreated()
            ->assertJsonPath('data.card_color', $color);
    }
});

it('requires admission_type only when no transaction_id is given', function () {
    $worker = cmrUser();
    Sanctum::actingAs($worker);

    $this->postJson('/api/cases', [
        'patient_id' => $this->patient->id,
        'case_type' => 'medical',
        'priority_level' => 'high',
        // no admission_type, no transaction_id
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('admission_type');
});

it('exposes the new fields with created_by_user on the show route', function () {
    $worker = cmrUser('MSS Head');
    Sanctum::actingAs($worker);
    $case = app(App\Services\CaseModelService::class)->create(
        App\DTOs\CaseModelDto::fromArray([
            'patient_id' => $this->patient->id, 'case_type' => 'medical',
            'priority_level' => 'high', 'admission_type' => 'ER', 'card_color' => 'green',
        ]),
        $worker,
    );

    $this->getJson("/api/cases/{$case->id}")
        ->assertOk()
        ->assertJsonPath('data.card_color', 'green')
        ->assertJsonPath('data.created_by', $worker->id)
        ->assertJsonPath('data.created_by_user.id', $worker->id)
        ->assertJsonPath('data.created_by_user.name', $worker->employee_name);
});
