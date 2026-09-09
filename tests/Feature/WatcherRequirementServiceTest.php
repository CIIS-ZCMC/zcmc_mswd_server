<?php

use App\Enums\WatcherRequirement;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use App\Services\WatcherRequirementService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = new WatcherRequirementService;
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->user = User::factory()->create();
});

function requirementPatient(array $overrides = []): Patient
{
    return Patient::create(array_merge([
        'sector_id' => test()->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
        'birthdate' => now()->subYears(30)->toDateString(),
    ], $overrides));
}

function requirementCase(Patient $patient, array $overrides = []): CaseModel
{
    return CaseModel::create(array_merge([
        'patient_id' => $patient->id, 'assigned_user_id' => test()->user->id,
        'case_code' => 'CASE-'.uniqid(), 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'OPD', 'date_opened' => now(),
    ], $overrides));
}

it('resolves the requirement truth table for an adult patient', function (string $admissionType, WatcherRequirement $expected) {
    $case = requirementCase(requirementPatient(), ['admission_type' => $admissionType]);

    expect($this->service->resolve($case))->toBe($expected);
})->with([
    'inpatient' => ['inpatient', WatcherRequirement::Required],
    'ER' => ['ER', WatcherRequirement::Recommended],
    'OPD' => ['OPD', WatcherRequirement::Optional],
    'an unrecognised admission type' => ['home_visit', WatcherRequirement::Optional],
]);

it('requires a watcher for a minor regardless of admission type', function (string $admissionType) {
    $minor = requirementPatient(['birthdate' => now()->subYears(10)->toDateString()]);
    $case = requirementCase($minor, ['admission_type' => $admissionType]);

    expect($this->service->resolve($case))->toBe(WatcherRequirement::Required);
})->with(['inpatient', 'ER', 'OPD']);

it('falls back to estimated_age to determine minority when birthdate is unknown', function () {
    $unidentifiedMinor = requirementPatient(['birthdate' => null, 'estimated_age' => 15]);
    $case = requirementCase($unidentifiedMinor, ['admission_type' => 'OPD']);

    expect($this->service->resolve($case))->toBe(WatcherRequirement::Required);
});

it('requires a watcher for an incapacitated adult regardless of admission type', function () {
    $patient = requirementPatient(['is_incapacitated' => true]);
    $case = requirementCase($patient, ['admission_type' => 'OPD']);

    expect($this->service->resolve($case))->toBe(WatcherRequirement::Required);
});

it('treats an approved waiver as overriding everything, including a minor patient', function () {
    $minor = requirementPatient(['birthdate' => now()->subYears(5)->toDateString()]);
    $case = requirementCase($minor, [
        'admission_type' => 'inpatient',
        'watcher_waiver_reason' => 'unaccompanied',
        'watcher_waived_by' => $this->user->id,
        'watcher_waived_at' => now(),
    ]);

    expect($this->service->resolve($case))->toBe(WatcherRequirement::Waived);
});

it('does not treat a waiver reason without a waived_at timestamp as approved', function () {
    $case = requirementCase(requirementPatient(), [
        'admission_type' => 'inpatient',
        'watcher_waiver_reason' => 'unaccompanied',
        'watcher_waived_at' => null,
    ]);

    expect($this->service->resolve($case))->toBe(WatcherRequirement::Required);
});

it('treats a legacy-exempt case as waived, overriding admission type', function () {
    $case = requirementCase(requirementPatient(), [
        'admission_type' => 'inpatient',
        'watcher_legacy_exempt' => true,
    ]);

    expect($this->service->resolve($case))->toBe(WatcherRequirement::Waived);
});

it('derives has_primary, satisfied and blocking from the requirement and current watchers', function () {
    $case = requirementCase(requirementPatient(), ['admission_type' => 'inpatient']);

    $status = $this->service->status($case);
    expect($status)->toBe([
        'requirement' => 'required',
        'has_primary' => false,
        'satisfied' => false,
        'blocking' => true,
    ]);

    $case->watchers()->create(['name' => 'Maria', 'relationship' => 'spouse', 'is_primary' => true, 'added_by' => $this->user->id]);

    expect($this->service->status($case->refresh()))->toBe([
        'requirement' => 'required',
        'has_primary' => true,
        'satisfied' => true,
        'blocking' => false,
    ]);
});

it('is never blocking for an OPD case even with no watcher', function () {
    $case = requirementCase(requirementPatient(), ['admission_type' => 'OPD']);

    expect($this->service->status($case)['blocking'])->toBeFalse();
});
