<?php

use App\Filament\Resources\Patients\Pages\ViewPatient;
use App\Filament\Resources\Patients\RelationManagers\FamilyMembersRelationManager;
use App\Models\Patient;
use App\Models\PatientFamilyMember;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Juan', 'last_name' => 'Dela Cruz', 'sex' => 'male',
    ]);
});

function familyRmUser(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function familyRm(Patient $patient)
{
    return Livewire::test(FamilyMembersRelationManager::class, [
        'ownerRecord' => $patient,
        'pageClass' => ViewPatient::class,
    ]);
}

function familyMemberFor(Patient $patient): PatientFamilyMember
{
    return $patient->familyMembers()->create([
        'name' => 'Maria', 'relationship' => 'spouse', 'sex' => 'female',
        'birthdate' => '1985-03-02', 'educational_attainment' => 'College graduate',
        'occupation' => 'Vendor',
    ]);
}

it('edits a family member from the patient view page', function () {
    actingAs(familyRmUser());
    $member = familyMemberFor($this->patient);

    familyRm($this->patient)
        ->callTableAction('edit', $member, data: [
            'name' => 'Maria Cruz',
            'occupation' => 'Teacher',
            'contact_number' => '09171234567',
        ])
        ->assertHasNoTableActionErrors();

    expect($member->refresh())
        ->name->toBe('Maria Cruz')
        ->occupation->toBe('Teacher')
        ->contact_number->toBe('09171234567')
        // Untouched by the edit form.
        ->educational_attainment->toBe('College graduate');
});

it('removes a family member from the patient view page', function () {
    actingAs(familyRmUser());
    $member = familyMemberFor($this->patient);

    familyRm($this->patient)->callTableAction('delete', $member);

    expect($this->patient->familyMembers()->count())->toBe(0)
        ->and(PatientFamilyMember::onlyTrashed()->whereKey($member->id)->exists())->toBeTrue();
});

it('gates create/edit/delete on patients.update', function () {
    $member = familyMemberFor($this->patient);

    actingAs(familyRmUser('Processor')); // patients.view only
    $manager = new FamilyMembersRelationManager;
    expect($manager->canCreate())->toBeFalse()
        ->and($manager->canEdit($member))->toBeFalse()
        ->and($manager->canDelete($member))->toBeFalse();

    actingAs(familyRmUser('MSS Head'));
    expect($manager->canCreate())->toBeTrue()
        ->and($manager->canEdit($member))->toBeTrue()
        ->and($manager->canDelete($member))->toBeTrue();
});
