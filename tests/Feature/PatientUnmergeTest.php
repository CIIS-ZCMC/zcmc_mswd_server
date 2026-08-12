<?php

use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\PatientMerge;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
});

function unmergeActor(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function unmergePatient(int $sectorId): Patient
{
    return Patient::create([
        'sector_id' => $sectorId, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female', 'birthdate' => '1990-01-01',
    ]);
}

it('reverses a merge, restoring the source and moving its records back', function () {
    $actor = unmergeActor();
    Sanctum::actingAs($actor);
    $source = unmergePatient($this->sector->id);
    $target = unmergePatient($this->sector->id);
    $pid = $source->patientIds()->create(['id_type' => 'philhealth', 'id_number' => 'PH-1']);
    $case = CaseModel::create([
        'patient_id' => $source->id, 'assigned_user_id' => $actor->id, 'case_code' => 'C-1',
        'case_type' => 'medical', 'priority_level' => 'low', 'status' => 'closed',
        'admission_type' => 'OPD', 'date_opened' => now(),
    ]);

    $this->postJson("/api/patients/{$source->id}/merge", ['target_id' => $target->id])->assertOk();
    expect($source->fresh()->trashed())->toBeTrue()
        ->and($pid->fresh()->patient_id)->toBe($target->id)
        ->and($case->fresh()->patient_id)->toBe($target->id);

    $this->postJson("/api/patients/{$target->id}/unmerge")
        ->assertOk()
        ->assertJsonPath('data.id', $source->id);

    expect(Patient::find($source->id))->not->toBeNull()               // restored
        ->and($pid->fresh()->patient_id)->toBe($source->id)          // moved back
        ->and($case->fresh()->patient_id)->toBe($source->id)
        ->and(PatientMerge::first()->reversed_at)->not->toBeNull();
});

it('rejects unmerge when there is no merge to reverse', function () {
    Sanctum::actingAs(unmergeActor());
    $patient = unmergePatient($this->sector->id);

    $this->postJson("/api/patients/{$patient->id}/unmerge")
        ->assertUnprocessable()
        ->assertJsonValidationErrorFor('patient');
});

it('lists the merge history for a patient', function () {
    Sanctum::actingAs(unmergeActor());
    $source = unmergePatient($this->sector->id);
    $target = unmergePatient($this->sector->id);
    $this->postJson("/api/patients/{$source->id}/merge", ['target_id' => $target->id])->assertOk();

    $this->getJson("/api/patients/{$target->id}/merges")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.is_reversed', false)
        ->assertJsonPath('data.0.source_patient_id', $source->id);
});

it('forbids unmerge without patients.merge', function () {
    Sanctum::actingAs(unmergeActor('Case Manager')); // no patients.merge
    $patient = unmergePatient($this->sector->id);

    $this->postJson("/api/patients/{$patient->id}/unmerge")->assertForbidden();
});
