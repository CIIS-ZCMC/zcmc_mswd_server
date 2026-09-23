<?php

use App\Models\Bizbox\AdmissionResult;
use App\Models\Bizbox\Discount;
use App\Models\Bizbox\HospitalCaseType;
use App\Models\Bizbox\HospitalPlan;
use App\Models\Bizbox\Membership;
use App\Models\Bizbox\ServiceType;
use App\Models\Bizbox\TransactionType;
use App\Models\User;
use App\Repositories\Contracts\AdmissionResultRepositoryInterface;
use App\Repositories\Contracts\DiscountRepositoryInterface;
use App\Repositories\Contracts\HospitalCaseTypeRepositoryInterface;
use App\Repositories\Contracts\HospitalPlanRepositoryInterface;
use App\Repositories\Contracts\MembershipRepositoryInterface;
use App\Repositories\Contracts\ServiceTypeRepositoryInterface;
use App\Repositories\Contracts\TransactionTypeRepositoryInterface;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

function hisLookupUser(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

/**
 * Each HIS lookup endpoint: URL, its repository interface, the model class and
 * its primary-key column. Models are built in-test with forceFill() so no test
 * ever touches the sqlsrv connection. Only the primary key is proven, so only
 * the key is asserted.
 */
dataset('his_lookups', [
    'admission results' => ['/api/hospital-admission-results', AdmissionResultRepositoryInterface::class, AdmissionResult::class, 'PK_mscAdmResults'],
    'discounts' => ['/api/hospital-discounts', DiscountRepositoryInterface::class, Discount::class, 'PK_mscDiscounts'],
    'case types' => ['/api/hospital-case-types', HospitalCaseTypeRepositoryInterface::class, HospitalCaseType::class, 'PK_mscHospCaseTypes'],
    'hospital plans' => ['/api/hospital-plans', HospitalPlanRepositoryInterface::class, HospitalPlan::class, 'PK_mscHospPlan'],
    'memberships' => ['/api/hospital-memberships', MembershipRepositoryInterface::class, Membership::class, 'PK_mscPHICMemberships'],
    'service types' => ['/api/hospital-service-types', ServiceTypeRepositoryInterface::class, ServiceType::class, 'PK_mscServiceType'],
    'transaction types' => ['/api/hospital-transaction-types', TransactionTypeRepositoryInterface::class, TransactionType::class, 'PK_mscHospTranTypes'],
]);

it('lists the lookup rows', function (string $url, string $interface, string $model, string $pk) {
    Sanctum::actingAs(hisLookupUser());

    $row = (new $model)->forceFill([$pk => 1]);

    $this->mock($interface, function ($mock) use ($row) {
        $mock->shouldReceive('all')->andReturn(new Collection([$row]));
    });

    $this->getJson($url)
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', 1);
})->with('his_lookups');

it('returns an empty list rather than a 500 when the HIS is unreachable', function (string $url, string $interface) {
    Sanctum::actingAs(hisLookupUser());

    // The repository throws (SQL Server down); the service must swallow it.
    $this->mock($interface, function ($mock) {
        $mock->shouldReceive('all')->andThrow(new QueryException(
            'sqlsrv', 'select 1', [], new RuntimeException('no connection'),
        ));
    });

    $this->getJson($url)
        ->assertOk()
        ->assertJsonCount(0, 'data');
})->with('his_lookups');

it('refuses a user without patients.view', function (string $url) {
    Sanctum::actingAs(User::factory()->create(['role' => 'Social Worker'])); // no role assigned → no permissions

    $this->getJson($url)->assertForbidden();
})->with('his_lookups');

it('refuses an unauthenticated caller', function (string $url) {
    $this->getJson($url)->assertUnauthorized();
})->with('his_lookups');
