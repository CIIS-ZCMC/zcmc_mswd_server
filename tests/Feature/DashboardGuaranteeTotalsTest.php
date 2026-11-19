<?php

use App\Models\AssistantType;
use App\Models\CaseModel;
use App\Models\Guarantor;
use App\Models\Patient;
use App\Models\PatientGuarantee;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\GuarantorSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->seed(GuarantorSeeder::class);
    Carbon::setTestNow('2026-10-14 08:00:00');

    $this->processor = User::factory()->create(['role' => 'Processor']);
    $this->processor->assignRole('Processor');

    $sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create(['sector_id' => $sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female']);
    $this->type = AssistantType::where('code', 'hospital_bills')->firstOrFail();
});

afterEach(fn () => Carbon::setTestNow());

function dashGuarantee(Patient $patient, string $guarantor, string $on, float $amount, string $status = 'not_required'): PatientGuarantee
{
    $guarantee = PatientGuarantee::create([
        'patient_id' => $patient->id, 'his_transaction_id' => 1,
        'guarantor_id' => Guarantor::where('name', $guarantor)->firstOrFail()->id,
        'guaranteed_on' => $on, 'recorded_by' => User::query()->value('id'),
        'approval_status' => $status,
    ]);
    $guarantee->items()->create(['assistant_type_id' => test()->type->id, 'amount' => $amount]);

    return $guarantee;
}

it('totals guarantee amounts per day and guarantor', function () {
    dashGuarantee($this->patient, 'MAIFIP', '2026-10-12', 1000);
    dashGuarantee($this->patient, 'MAIFIP', '2026-10-12', 500);
    dashGuarantee($this->patient, 'PCSO', '2026-10-12', 250);
    dashGuarantee($this->patient, 'MAIFIP', '2026-10-14', 2000, 'approved');

    Sanctum::actingAs($this->processor);
    $data = $this->getJson('/api/dashboard/guarantee-totals?from=2026-10-12&to=2026-10-14')->assertOk()->json('data');

    expect($data['days'])->toHaveCount(3)
        ->and($data['days'][0]['date'])->toBe('2026-10-12')
        ->and($data['days'][0]['by_guarantor'])->toEqual(['MAIFIP' => 1500, 'PCSO' => 250])
        ->and($data['days'][1]['total'])->toEqual(0)
        ->and($data['days'][2]['by_guarantor'])->toEqual(['MAIFIP' => 2000])
        ->and($data['total'])->toEqual(3750);
});

it('defaults to the last seven days', function () {
    Sanctum::actingAs($this->processor);

    $data = $this->getJson('/api/dashboard/guarantee-totals')->assertOk()->json('data');

    expect($data['days'])->toHaveCount(7)
        ->and($data['to'])->toBe('2026-10-14')
        ->and($data['from'])->toBe('2026-10-08');
});

it('leaves out a guarantee that is still waiting for approval', function () {
    dashGuarantee($this->patient, 'MAIFIP', '2026-10-14', 60000, 'pending');

    Sanctum::actingAs($this->processor);

    expect($this->getJson('/api/dashboard/guarantee-totals?from=2026-10-14&to=2026-10-14')->json('data.total'))->toEqual(0);
});

it('leaves out patients with a protective case unless the viewer may see them', function () {
    CaseModel::create([
        'patient_id' => $this->patient->id, 'assigned_user_id' => $this->processor->id,
        'case_code' => 'CASE-P', 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'OPD', 'date_opened' => now(), 'is_protective' => true,
    ]);
    dashGuarantee($this->patient, 'MAIFIP', '2026-10-14', 1000);

    Sanctum::actingAs($this->processor);
    $response = $this->getJson('/api/dashboard/guarantee-totals?from=2026-10-14&to=2026-10-14')->assertOk();
    expect($response->json('data.total'))->toEqual(0)
        ->and($response->json('data.protective_excluded'))->toBeTrue();

    $admin = User::factory()->create(['role' => 'Admin']);
    $admin->assignRole('Admin');
    Sanctum::actingAs($admin);
    expect($this->getJson('/api/dashboard/guarantee-totals?from=2026-10-14&to=2026-10-14')->json('data.total'))->toEqual(1000);
});

it('is gated by guarantee.view', function () {
    $user = User::factory()->create();

    Sanctum::actingAs($user);
    $this->getJson('/api/dashboard/guarantee-totals')->assertForbidden();
});
