<?php

use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\UnifiedIntakeSheet;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
});

function mergeUser(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function mkPatient(array $overrides = []): Patient
{
    return Patient::create(array_merge([
        'sector_id' => test()->sector->id,
        'first_name' => 'Juan', 'last_name' => 'Dela Cruz', 'sex' => 'male', 'birthdate' => '1980-05-01',
    ], $overrides));
}

it('lists candidate duplicates excluding self and non-matches', function () {
    Sanctum::actingAs(mergeUser());
    $a = mkPatient();
    $dupe = mkPatient();
    mkPatient(['first_name' => 'Pedro', 'birthdate' => '1990-01-01']); // non-match

    $this->getJson("/api/patients/{$a->id}/duplicates")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $dupe->id);
});

it('merges a source patient into a target, reassigning records', function () {
    $user = mergeUser();
    Sanctum::actingAs($user);

    $source = mkPatient();
    $target = mkPatient();

    $case = CaseModel::create([
        'patient_id' => $source->id, 'assigned_user_id' => $user->id, 'case_code' => 'CASE-M1',
        'case_type' => 'medical', 'priority_level' => 'high', 'status' => 'open',
        'admission_type' => 'ER', 'date_opened' => now(),
    ]);
    $source->patientIds()->create(['id_type' => 'philhealth', 'id_number' => 'PH-1']);
    UnifiedIntakeSheet::create([
        'intake_no' => 'UIS-TEST-1', 'patient_id' => $source->id, 'case_id' => $case->id,
        'intake_worker_id' => $user->id, 'date_of_intake' => now(), 'status' => 'draft',
    ]);

    $this->postJson("/api/patients/{$source->id}/merge", ['target_id' => $target->id])
        ->assertOk()
        ->assertJsonPath('data.id', $target->id);

    // Source archived, records reassigned to target
    expect(Patient::find($source->id))->toBeNull()
        ->and(Patient::withTrashed()->find($source->id)->trashed())->toBeTrue()
        ->and($case->fresh()->patient_id)->toBe($target->id)
        ->and($target->patientIds()->count())->toBe(1)
        ->and(UnifiedIntakeSheet::where('intake_no', 'UIS-TEST-1')->first()->patient_id)->toBe($target->id);

    // Merge is audited on the target
    expect(Activity::where('description', 'patient_merged')
        ->where('subject_id', $target->id)->exists())->toBeTrue();
});

it('rejects merging a patient into itself', function () {
    Sanctum::actingAs(mergeUser());
    $patient = mkPatient();

    $this->postJson("/api/patients/{$patient->id}/merge", ['target_id' => $patient->id])
        ->assertUnprocessable()
        ->assertJsonValidationErrorFor('target_id');
});

it('forbids merge without patients.merge', function () {
    Sanctum::actingAs(mergeUser('Case Manager')); // has patients.view, not merge
    $source = mkPatient();
    $target = mkPatient();

    $this->postJson("/api/patients/{$source->id}/merge", ['target_id' => $target->id])
        ->assertForbidden();

    expect(Patient::find($source->id))->not->toBeNull();
});
