<?php

use App\Models\AssistantType;
use App\Models\Bizbox\HospitalPatient;
use App\Models\Bizbox\PatientTransaction;
use App\Models\FundSource;
use App\Models\Guarantor;
use App\Models\ModeOfAssistance;
use App\Models\Patient;
use App\Models\PatientGuarantee;
use App\Models\Sector;
use App\Models\User;
use App\Repositories\Contracts\PatientTransactionRepositoryInterface;
use Database\Seeders\GuarantorSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->seed(GuarantorSeeder::class);

    $sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create([
        'sector_id' => $sector->id, 'hospital_id' => 777,
        'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);

    $this->maifip = Guarantor::where('name', 'MAIFIP')->firstOrFail();
    $this->type = AssistantType::where('code', 'hospital_bills')->firstOrFail();
    $this->mode = ModeOfAssistance::where('code', 'financial_assistance')->firstOrFail();
    $this->fund = FundSource::where('code', 'city_mayor')->firstOrFail();

    // The HIS lookup returns an encounter of this patient (no sqlsrv).
    $transaction = (new PatientTransaction)->forceFill(['PK_psPatRegisters' => 9, 'FK_emdPatients' => 5]);
    $transaction->setRelation('patient', (new HospitalPatient)->forceFill(['PK_emdPatients' => 5, 'patid' => 777]));
    $this->mock(PatientTransactionRepositoryInterface::class, function ($mock) use ($transaction) {
        $mock->shouldReceive('find')->andReturn($transaction);
    });

    $this->processor = gaUser('Processor');
    $this->supervisor = gaUser('Supervisor');
    $this->head = gaUser('Head');
});

function gaUser(string $role): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function gaPayload(float $amount, array $overrides = []): array
{
    return array_merge([
        'his_transaction_id' => 9,
        'guarantor_id' => test()->maifip->id,
        'guaranteed_on' => '2026-10-06',
        'items' => [[
            'assistant_type_id' => test()->type->id,
            'amount' => $amount,
            'mode_of_assistance_id' => test()->mode->id,
            'fund_source_id' => test()->fund->id,
        ]],
    ], $overrides);
}

/** Records a guarantee of `$amount` as the Processor and returns its id. */
function gaCreate(float $amount): int
{
    Sanctum::actingAs(test()->processor);

    return test()->postJson('/api/patients/'.test()->patient->id.'/guarantees', gaPayload($amount))
        ->assertCreated()
        ->json('data.id');
}

it('saves a guarantee below the threshold as not requiring approval', function () {
    $id = gaCreate(49999.99);

    expect(PatientGuarantee::find($id)->approval_status)->toBe('not_required');
});

it('saves a guarantee at the threshold as pending', function () {
    $id = gaCreate(50000);

    $guarantee = PatientGuarantee::find($id);

    expect($guarantee->approval_status)->toBe('pending')
        ->and($guarantee->approved_by)->toBeNull();
});

it('lets a supervisor and a head approve a pending guarantee', function (string $role) {
    $id = gaCreate(60000);

    Sanctum::actingAs($this->{$role});
    $this->postJson("/api/guarantees/{$id}/approve")
        ->assertOk()
        ->assertJsonPath('data.approval_status', 'approved')
        ->assertJsonPath('data.approved_by.id', $this->{$role}->id);

    expect(PatientGuarantee::find($id)->approved_at)->not->toBeNull();
})->with(['supervisor', 'head']);

it('refuses approval from a worker without guarantee.approve', function () {
    $id = gaCreate(60000);

    Sanctum::actingAs($this->processor);
    $this->postJson("/api/guarantees/{$id}/approve")->assertForbidden();

    expect(PatientGuarantee::find($id)->approval_status)->toBe('pending');
});

it('answers 422 when approving a guarantee that is not pending', function () {
    $small = gaCreate(1000);
    $big = gaCreate(60000);

    Sanctum::actingAs($this->supervisor);
    $this->postJson("/api/guarantees/{$small}/approve")->assertUnprocessable();

    $this->postJson("/api/guarantees/{$big}/approve")->assertOk();
    $this->postJson("/api/guarantees/{$big}/approve")->assertUnprocessable();
});

it('sends an approved guarantee back to pending when its amounts change', function () {
    $id = gaCreate(60000);
    Sanctum::actingAs($this->supervisor);
    $this->postJson("/api/guarantees/{$id}/approve")->assertOk();

    // A note does not need a new sign-off.
    Sanctum::actingAs($this->processor);
    $this->putJson("/api/guarantees/{$id}", ['remarks' => 'Endorsed by the ward'])->assertOk();
    expect(PatientGuarantee::find($id)->approval_status)->toBe('approved');

    // The amounts do.
    $this->putJson("/api/guarantees/{$id}", ['items' => gaPayload(70000)['items']])
        ->assertOk()
        ->assertJsonPath('data.approval_status', 'pending');

    $guarantee = PatientGuarantee::find($id);
    expect($guarantee->approved_by)->toBeNull()->and($guarantee->approved_at)->toBeNull();
});

it('drops the approval need when an edit brings the total under the threshold', function () {
    $id = gaCreate(60000);

    Sanctum::actingAs($this->processor);
    $this->putJson("/api/guarantees/{$id}", ['items' => gaPayload(5000)['items']])
        ->assertOk()
        ->assertJsonPath('data.approval_status', 'not_required');
});

it('lists the guarantees waiting for approval, to approvers only', function () {
    $pending = gaCreate(60000);
    gaCreate(1000);

    Sanctum::actingAs($this->supervisor);
    $response = $this->getJson('/api/guarantees/pending-approval')->assertOk();

    expect($response->json('count'))->toBe(1)
        ->and($response->json('data.0.id'))->toBe($pending)
        ->and($response->json('data.0.total'))->toEqual(60000)
        ->and($response->json('data.0.patient.name'))->toBe('Reyes, Ana')
        ->and($response->json('threshold'))->toEqual(50000);

    Sanctum::actingAs($this->processor);
    $this->getJson('/api/guarantees/pending-approval')->assertForbidden();
});

it('will not print the acknowledgement slip while a guarantee is pending', function () {
    $id = gaCreate(60000);

    $this->getJson("/api/guarantees/{$id}/acknowledgement-slip/pdf")
        ->assertUnprocessable()
        ->assertJsonPath('code', 'awaiting_approval');

    $this->getJson('/api/patient-transactions/9/acknowledgement-slip/pdf')
        ->assertUnprocessable()
        ->assertJsonPath('code', 'awaiting_approval');
});
