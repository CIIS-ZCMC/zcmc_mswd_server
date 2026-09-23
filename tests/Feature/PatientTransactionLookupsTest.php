<?php

use App\Models\Bizbox\AdmissionResult;
use App\Models\Bizbox\Discount;
use App\Models\Bizbox\HospitalCaseType;
use App\Models\Bizbox\HospitalPlan;
use App\Models\Bizbox\Membership;
use App\Models\Bizbox\PatientTransaction;
use App\Models\Bizbox\ServiceType;
use App\Models\Bizbox\TransactionType;
use App\Models\User;
use App\Repositories\Contracts\PatientTransactionRepositoryInterface;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Pagination\LengthAwarePaginator;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

function lookupUser(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

/**
 * Each lookup on a transaction: the JSON key, the relation and its model with
 * that model's primary-key column. Relations are attached with setRelation() so
 * no test touches the sqlsrv connection.
 */
dataset('transaction_lookups', [
    'hospital plan' => ['hospital_plan', 'hospitalPlan', HospitalPlan::class, 'PK_mscHospPlan'],
    'discount' => ['discount', 'discount', Discount::class, 'PK_mscDiscounts'],
    'service type' => ['service_type', 'serviceType', ServiceType::class, 'PK_mscServiceType'],
    'case type' => ['admission_case_type', 'caseType', HospitalCaseType::class, 'PK_mscHospCaseTypes'],
    'membership' => ['membership', 'membership', Membership::class, 'PK_mscPHICMemberships'],
    'transaction type' => ['transaction_type', 'transactionType', TransactionType::class, 'PK_mscHospTranTypes'],
    'admission result' => ['admission_result', 'admissionResult', AdmissionResult::class, 'PK_mscAdmResults'],
]);

/** A bare transaction, no relations loaded. */
function bareTransaction(int $key = 9): PatientTransaction
{
    return (new PatientTransaction)->forceFill([
        'PK_psPatRegisters' => $key,
        'FK_emdPatients' => 5,
        'registrydate' => '2026-09-14 08:30:00',
    ]);
}

it('nests a lookup vocabulary on the single-transaction read', function (string $key, string $relation, string $model, string $pk) {
    Sanctum::actingAs(lookupUser());

    $transaction = bareTransaction();
    $transaction->setRelation($relation, (new $model)->forceFill([$pk => 3]));

    $this->mock(PatientTransactionRepositoryInterface::class, function ($mock) use ($transaction) {
        $mock->shouldReceive('find')->with('9')->andReturn($transaction);
    });

    $this->getJson('/api/patient-transactions/9')
        ->assertOk()
        ->assertJsonPath("data.{$key}.id", 3);
})->with('transaction_lookups');

it('renders a loaded but empty lookup as null rather than failing', function (string $key, string $relation) {
    // A transaction with no discount, or no PhilHealth membership, is ordinary.
    Sanctum::actingAs(lookupUser());

    $transaction = bareTransaction();
    $transaction->setRelation($relation, null);

    $this->mock(PatientTransactionRepositoryInterface::class, function ($mock) use ($transaction) {
        $mock->shouldReceive('find')->with('9')->andReturn($transaction);
    });

    $this->getJson('/api/patient-transactions/9')
        ->assertOk()
        ->assertJsonPath("data.{$key}", null);
})->with('transaction_lookups');

it('omits every lookup key from the paginated list', function (string $key) {
    // Locks §C.1.4 in: a later stray withLookups() on paginate() would add
    // round-trips to a list row that shows none of this.
    Sanctum::actingAs(lookupUser());

    $this->mock(PatientTransactionRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('paginate')->andReturn(
            new LengthAwarePaginator([bareTransaction()], 1, 15),
        );
    });

    $this->getJson('/api/patient-transactions')
        ->assertOk()
        ->assertJsonMissingPath("data.0.{$key}");
})->with('transaction_lookups');

it('omits every lookup key from the search results', function (string $key) {
    // search() feeds a typeahead — one call per keystroke.
    Sanctum::actingAs(lookupUser());

    $this->mock(PatientTransactionRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('findByNameAndHospitalNumber')
            ->andReturn(new Collection([bareTransaction()]));
    });

    $this->getJson('/api/patient-transactions/find?name=Santos')
        ->assertOk()
        ->assertJsonMissingPath("data.0.{$key}");
})->with('transaction_lookups');
