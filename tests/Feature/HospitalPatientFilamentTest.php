<?php

use App\Filament\Resources\HospitalPatients\HospitalPatientResource;
use App\Filament\Resources\HospitalPatients\Pages\ListHospitalPatients;
use App\Filament\Resources\HospitalPatients\Pages\ViewHospitalPatient;
use App\Models\Bizbox\DataCenter;
use App\Models\Bizbox\HospitalPatient;
use App\Models\Bizbox\PatientGuarantors;
use App\Models\Bizbox\PatientPersonalData;
use App\Models\Bizbox\PatientTransaction;
use App\Models\User;
use App\Repositories\Contracts\HospitalPatientRepositoryInterface;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Pagination\LengthAwarePaginator;
use Livewire\Livewire;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

function hpPanelActor(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

/**
 * A HIS patient with personal data and transactions attached, so no test ever
 * touches the sqlsrv connection.
 */
function hpPanelPatient(int $key = 5, int $patid = 777, bool $withTransactions = true): HospitalPatient
{
    $personal = (new PatientPersonalData)->forceFill([
        'firstname' => 'Pedro', 'lastname' => 'Santos', 'middlename' => 'M',
        'gender' => 'Male', 'birthdate' => '1980-05-01 00:00:00', 'civilstatus' => 'S',
    ]);

    $patient = (new HospitalPatient)->forceFill(['PK_emdPatients' => $key, 'patid' => $patid]);
    $patient->setRelation('personalData', $personal);

    $transactions = new Collection;

    if ($withTransactions) {
        $account = (new DataCenter)->forceFill(['PK_psDatacenter' => 900]);
        $account->setRelation('personalData', (new PatientPersonalData)->forceFill([
            'firstname' => 'Maria', 'lastname' => 'Cruz',
        ]));

        $guarantor = (new PatientGuarantors)->forceFill(['PK_TRXNO' => 1, 'FK_faCustomers' => 900]);
        $guarantor->setRelation('guarantor', $account);

        $transaction = (new PatientTransaction)->forceFill([
            'PK_psPatRegisters' => 9, 'FK_emdPatients' => $key, 'registrydate' => '2026-09-14 08:30:00',
        ]);
        $transaction->setRelation('guarantors', new Collection([$guarantor]));

        $transactions->push($transaction);
    }

    $patient->setRelation('transactions', $transactions);

    return $patient;
}

it('gates the resource on hospital-patients.view and is read-only', function () {
    actingAs(hpPanelActor('MSS Head'));
    expect(HospitalPatientResource::canViewAny())->toBeTrue();

    actingAs(User::factory()->create()); // no roles
    expect(HospitalPatientResource::canViewAny())->toBeFalse();

    // Read-only by construction, for everyone.
    actingAs(hpPanelActor('Admin'));
    expect(HospitalPatientResource::canCreate())->toBeFalse()
        ->and(HospitalPatientResource::canEdit(hpPanelPatient()))->toBeFalse()
        ->and(HospitalPatientResource::canDelete(hpPanelPatient()))->toBeFalse();
});

it('lists HIS patients through the resilient service', function () {
    actingAs(hpPanelActor());

    $this->mock(HospitalPatientRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('paginate')
            ->andReturn(new LengthAwarePaginator([hpPanelPatient()], 1, 15, 1));
    });

    Livewire::test(ListHospitalPatients::class)
        ->assertOk()
        ->assertCanSeeTableRecords([hpPanelPatient()])
        ->assertSee('Santos, Pedro M')
        ->assertSee('777');
});

it('passes a hospital-number search term through to the resilient service', function () {
    // The patid match itself is SQL against sqlsrv (untestable here per the
    // module constraint); this locks in that a browse-list search term reaches
    // the service that runs it.
    actingAs(hpPanelActor());

    $this->mock(HospitalPatientRepositoryInterface::class, function ($mock) {
        // No term (initial render) → empty; the hospital-number term → the match.
        // Seeing the record therefore proves the term reached the service.
        $mock->shouldReceive('paginate')
            ->with(null, Mockery::any(), Mockery::any())
            ->andReturn(new LengthAwarePaginator([], 0, 15, 1));
        $mock->shouldReceive('paginate')
            ->with('777', Mockery::any(), Mockery::any())
            ->andReturn(new LengthAwarePaginator([hpPanelPatient()], 1, 15, 1));
    });

    Livewire::test(ListHospitalPatients::class)
        ->searchTable('777')
        ->assertOk()
        ->assertCanSeeTableRecords([hpPanelPatient()]);
});

it('renders an empty list — not a 500 — when the HIS is unreachable', function () {
    actingAs(hpPanelActor());

    $this->mock(HospitalPatientRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('paginate')
            ->andThrow(new QueryException('sqlsrv', 'select 1', [], new RuntimeException('unreachable')));
    });

    Livewire::test(ListHospitalPatients::class)
        ->assertOk()
        ->assertCanSeeTableRecords([]);
});

it('shows personal data and transactions on the view page', function () {
    actingAs(hpPanelActor());

    $this->mock(HospitalPatientRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('findWithTransactions')->with('5')->andReturn(hpPanelPatient(key: 5));
    });

    Livewire::test(ViewHospitalPatient::class, ['record' => 5])
        ->assertOk()
        ->assertSee('Pedro')
        ->assertSee('Santos')
        ->assertSee('Single')      // civil status code S, mapped
        ->assertSee(9)             // transaction no.
        ->assertSee('Cruz, Maria'); // guarantor
});

it('shows a patient with no transactions without erroring', function () {
    actingAs(hpPanelActor());

    $this->mock(HospitalPatientRepositoryInterface::class, function ($mock) {
        $mock->shouldReceive('findWithTransactions')->andReturn(hpPanelPatient(withTransactions: false));
    });

    Livewire::test(ViewHospitalPatient::class, ['record' => 5])
        ->assertOk()
        ->assertSee('No transactions found in the hospital system.');
});
