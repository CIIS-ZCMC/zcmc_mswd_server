<?php

use App\Models\Assessment;
use App\Models\CaseActivity;
use App\Models\CaseModel;
use App\Models\CaseWatcher;
use App\Models\Document;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\UnifiedIntakeSheet;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake();
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes',
        'sex' => 'female', 'birthdate' => '1980-01-01',
    ]);
    $this->owner = User::factory()->create();
    $this->case = makeSocialCaseEpisode($this->patient);
});

function scsrUser(string $role): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function makeSocialCaseEpisode(Patient $patient, array $overrides = []): CaseModel
{
    return CaseModel::create(array_merge([
        'patient_id' => $patient->id,
        'assigned_user_id' => test()->owner->id,
        'case_code' => 'CASE-'.uniqid(),
        'case_type' => 'medical',
        'priority_level' => 'high',
        'status' => 'open',
        'admission_type' => 'OPD', // Optional watcher requirement — never blocking by default.
        'date_opened' => now(),
    ], $overrides));
}

function makeAssessment(CaseModel $case, User $author, array $overrides = []): Assessment
{
    return Assessment::create(array_merge([
        'case_id' => $case->id,
        'created_by' => $author->id,
        'classification' => 'indigent',
        'total_family_income' => 8000,
        'presenting_problem' => 'Cannot afford maintenance medicine',
    ], $overrides));
}

// ---------------------------------------------------------------- starting

it('promotes the case\'s latest assessment rather than creating a new row', function () {
    $worker = scsrUser('Case Manager');
    makeAssessment($this->case, $worker, ['classification' => 'older']);
    $latest = makeAssessment($this->case, $worker, [
        'classification' => 'indigent', 'housing_type' => 'Owned', 'total_family_income' => 12000,
    ]);
    $latest->expenses()->create(['expense_type' => 'food', 'amount' => 3000]);

    Sanctum::actingAs($worker);
    $response = $this->postJson("/api/cases/{$this->case->id}/social-case", [
        'reason_for_referral' => 'Referred by ward nurse',
    ])->assertCreated();

    // The promoted row *is* the assessment, so its socioeconomic data and
    // expense lines carry over with no copying at all.
    expect($response->json('data.id'))->toBe($latest->id)
        ->and($response->json('data.housing_type'))->toBe('Owned')
        ->and($response->json('data.social_case_status'))->toBe('draft')
        ->and($response->json('data.revision'))->toBe(1)
        ->and($response->json('data.expenses'))->toHaveCount(1)
        ->and((float) $response->json('data.expenses_total'))->toBe(3000.0)
        ->and($response->json('data.prepared_by.id'))->toBe($worker->id);

    expect(Assessment::where('case_id', $this->case->id)->count())->toBe(2);
});

it('promotes an explicit assessment when one is named', function () {
    $worker = scsrUser('Case Manager');
    $chosen = makeAssessment($this->case, $worker, ['classification' => 'chosen']);
    makeAssessment($this->case, $worker, ['classification' => 'newer']);

    Sanctum::actingAs($worker);
    $response = $this->postJson("/api/cases/{$this->case->id}/social-case", [
        'assessment_id' => $chosen->id,
    ])->assertCreated();

    expect($response->json('data.id'))->toBe($chosen->id)
        ->and($response->json('data.classification'))->toBe('chosen');
});

it('rejects an assessment belonging to another case', function () {
    $worker = scsrUser('Case Manager');
    $otherCase = makeSocialCaseEpisode($this->patient);
    $foreign = makeAssessment($otherCase, $worker);

    Sanctum::actingAs($worker);
    $this->postJson("/api/cases/{$this->case->id}/social-case", ['assessment_id' => $foreign->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors('assessment_id');
});

it('creates an assessment when the case has none', function () {
    $worker = scsrUser('Case Manager');

    Sanctum::actingAs($worker);
    $response = $this->postJson("/api/cases/{$this->case->id}/social-case", [
        'classification' => 'indigent',
    ])->assertCreated();

    expect($response->json('data.classification'))->toBe('indigent');
    expect(Assessment::where('case_id', $this->case->id)->count())->toBe(1);
});

it('requires a classification when there is no assessment to promote', function () {
    $worker = scsrUser('Case Manager');

    Sanctum::actingAs($worker);
    $this->postJson("/api/cases/{$this->case->id}/social-case", [])
        ->assertStatus(422)
        ->assertJsonValidationErrors('classification');
});

it('refuses a second social case study on the same episode', function () {
    $worker = scsrUser('Case Manager');
    makeAssessment($this->case, $worker);

    Sanctum::actingAs($worker);
    $this->postJson("/api/cases/{$this->case->id}/social-case", [])->assertCreated();

    $this->postJson("/api/cases/{$this->case->id}/social-case", ['classification' => 'x'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('social_case_status');
});

it('lets the database reject a second flagged row inserted behind the service', function () {
    $worker = scsrUser('Case Manager');
    makeAssessment($this->case, $worker, ['social_case_status' => Assessment::SOCIAL_CASE_DRAFT]);

    // The invariant lives in the database, so Filament and artisan cannot
    // create a second SCSR either.
    expect(fn () => makeAssessment($this->case, $worker, [
        'social_case_status' => Assessment::SOCIAL_CASE_DRAFT,
    ]))->toThrow(QueryException::class);
});

it('allows any number of ordinary assessments alongside the social case study', function () {
    $worker = scsrUser('Case Manager');
    makeAssessment($this->case, $worker, ['social_case_status' => Assessment::SOCIAL_CASE_DRAFT]);

    makeAssessment($this->case, $worker);
    makeAssessment($this->case, $worker);

    expect(Assessment::where('case_id', $this->case->id)->count())->toBe(3);
});

it('frees the guard when the social case study is soft-deleted', function () {
    $worker = scsrUser('Case Manager');
    $first = makeAssessment($this->case, $worker, ['social_case_status' => Assessment::SOCIAL_CASE_DRAFT]);

    $first->delete();

    $replacement = makeAssessment($this->case, $worker, ['social_case_status' => Assessment::SOCIAL_CASE_DRAFT]);

    $this->assertSoftDeleted($first);
    expect($replacement->exists)->toBeTrue();
});

// ------------------------------------------------------- referral seeding

it('seeds referral fields from the latest finalized intake', function () {
    $worker = scsrUser('Case Manager');
    $assessment = makeAssessment($this->case, $worker);

    UnifiedIntakeSheet::create([
        'intake_no' => 'UIS-1', 'patient_id' => $this->patient->id, 'case_id' => $this->case->id,
        'assessment_id' => $assessment->id, 'intake_worker_id' => $worker->id,
        'referral_source' => 'walk_in', 'referral_details' => 'Came in unaccompanied',
        'date_of_intake' => now(), 'status' => UnifiedIntakeSheet::STATUS_DRAFT,
    ]);
    UnifiedIntakeSheet::create([
        'intake_no' => 'UIS-2', 'patient_id' => $this->patient->id, 'case_id' => $this->case->id,
        'assessment_id' => $assessment->id, 'intake_worker_id' => $worker->id,
        'referral_source' => 'ward_referral', 'referral_details' => 'Endorsed by Ward 3',
        'date_of_intake' => now(), 'status' => UnifiedIntakeSheet::STATUS_FINALIZED,
    ]);

    Sanctum::actingAs($worker);
    $response = $this->postJson("/api/cases/{$this->case->id}/social-case", [])->assertCreated();

    expect($response->json('data.referral_source'))->toBe('ward_referral')
        ->and($response->json('data.reason_for_referral'))->toBe('Endorsed by Ward 3');
});

it('prefers the supplied referral fields over the intake snapshot', function () {
    $worker = scsrUser('Case Manager');
    $assessment = makeAssessment($this->case, $worker);

    UnifiedIntakeSheet::create([
        'intake_no' => 'UIS-3', 'patient_id' => $this->patient->id, 'case_id' => $this->case->id,
        'assessment_id' => $assessment->id, 'intake_worker_id' => $worker->id,
        'referral_source' => 'walk_in', 'referral_details' => 'Came in unaccompanied',
        'date_of_intake' => now(), 'status' => UnifiedIntakeSheet::STATUS_FINALIZED,
    ]);

    Sanctum::actingAs($worker);
    $response = $this->postJson("/api/cases/{$this->case->id}/social-case", [
        'referral_source' => 'PCSO',
        'reason_for_referral' => 'Referred for financial assistance',
    ])->assertCreated();

    expect($response->json('data.referral_source'))->toBe('PCSO')
        ->and($response->json('data.reason_for_referral'))->toBe('Referred for financial assistance');
});

it('leaves referral fields null when the case has no intake', function () {
    $worker = scsrUser('Case Manager');
    makeAssessment($this->case, $worker);

    Sanctum::actingAs($worker);
    $response = $this->postJson("/api/cases/{$this->case->id}/social-case", [])->assertCreated();

    expect($response->json('data.referral_source'))->toBeNull()
        ->and($response->json('data.reason_for_referral'))->toBeNull();
});

// ------------------------------------------------------------- lifecycle

function startScsr(CaseModel $case, User $worker, array $payload = []): Assessment
{
    makeAssessment($case, $worker);

    Sanctum::actingAs($worker);
    test()->postJson("/api/cases/{$case->id}/social-case", $payload)->assertCreated();

    return $case->socialCase()->firstOrFail();
}

it('walks draft through review to finalized', function () {
    $worker = scsrUser('Case Manager');
    $head = scsrUser('MSS Head');
    $scsr = startScsr($this->case, $worker);

    Sanctum::actingAs($worker);
    $this->putJson("/api/cases/{$this->case->id}/social-case", [
        'medical_history' => 'Hypertensive, on maintenance since 2019',
        'recommendation' => 'Full medicine subsidy',
        'recommended_assistance' => 'Medicine',
        'recommended_amount' => 2500,
    ])->assertOk()->assertJsonPath('data.recommended_assistance', 'Medicine');

    $this->postJson("/api/cases/{$this->case->id}/social-case/submit")
        ->assertOk()
        ->assertJsonPath('data.social_case_status', 'for_review');

    expect($scsr->refresh()->review_requested_at)->not->toBeNull()
        ->and($scsr->prepared_at)->not->toBeNull();

    Sanctum::actingAs($head);
    $this->postJson("/api/cases/{$this->case->id}/social-case/finalize")
        ->assertOk()
        ->assertJsonPath('data.social_case_status', 'finalized')
        ->assertJsonPath('data.noted_by.id', $head->id);

    expect($scsr->refresh()->noted_at)->not->toBeNull();
});

it('backfills prepared_by when finalizing straight from draft', function () {
    $head = scsrUser('MSS Head');
    $scsr = startScsr($this->case, $head);

    // A one-person office must be able to sign without a review step.
    $this->postJson("/api/cases/{$this->case->id}/social-case/finalize")->assertOk();

    $scsr->refresh();
    expect($scsr->prepared_by)->toBe($head->id)
        ->and($scsr->prepared_at)->not->toBeNull()
        ->and($scsr->noted_by)->toBe($head->id);
});

it('refuses to submit anything but a draft', function () {
    $head = scsrUser('MSS Head');
    startScsr($this->case, $head);

    $this->postJson("/api/cases/{$this->case->id}/social-case/submit")->assertOk();
    $this->postJson("/api/cases/{$this->case->id}/social-case/submit")
        ->assertStatus(422)
        ->assertJsonValidationErrors('social_case_status');
});

it('blocks finalize when the watcher requirement is unmet', function () {
    $head = scsrUser('MSS Head');
    $inpatient = makeSocialCaseEpisode($this->patient, ['admission_type' => 'inpatient']);
    startScsr($inpatient, $head);

    $this->postJson("/api/cases/{$inpatient->id}/social-case/finalize")->assertStatus(422);

    CaseWatcher::create([
        'case_id' => $inpatient->id, 'name' => 'Maria Reyes',
        'relationship' => 'spouse', 'is_primary' => true, 'added_by' => $head->id,
    ]);

    $this->postJson("/api/cases/{$inpatient->id}/social-case/finalize")->assertOk();
});

it('archives a pdf document on finalize', function () {
    $head = scsrUser('MSS Head');
    $scsr = startScsr($this->case, $head);

    $this->postJson("/api/cases/{$this->case->id}/social-case/finalize")->assertOk();

    $scsr->refresh();
    $document = Document::where('case_id', $this->case->id)->where('document_type', 'social_case_study')->first();

    expect($document)->not->toBeNull()
        ->and($document->file_name)->toBe("{$scsr->social_case_no}-r1.pdf")
        ->and($document->patient_id)->toBe($this->patient->id);

    Storage::assertExists($document->file_path);
});

// ----------------------------------------------------- the finalized lock

it('rejects edits to a finalized report through both write paths', function () {
    $head = scsrUser('MSS Head');
    $scsr = startScsr($this->case, $head);
    $this->postJson("/api/cases/{$this->case->id}/social-case/finalize")->assertOk();

    $this->putJson("/api/cases/{$this->case->id}/social-case", ['presenting_problem' => 'rewritten'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('social_case_status');

    // The pre-existing assessment endpoint writes the same row, so the lock
    // has to live on the model, not only in SocialCaseService.
    $this->putJson("/api/assessments/{$scsr->id}", ['presenting_problem' => 'rewritten'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('social_case_status');

    expect($scsr->refresh()->presenting_problem)->not->toBe('rewritten');
});

it('refuses to delete a finalized report', function () {
    $head = scsrUser('MSS Head');
    $scsr = startScsr($this->case, $head);
    $this->postJson("/api/cases/{$this->case->id}/social-case/finalize")->assertOk();

    $this->deleteJson("/api/assessments/{$scsr->id}")
        ->assertStatus(422)
        ->assertJsonValidationErrors('social_case_status');
});

it('soft-deletes an ordinary assessment instead of hard-deleting it', function () {
    $head = scsrUser('MSS Head');
    $assessment = makeAssessment($this->case, $head);
    $assessment->expenses()->create(['expense_type' => 'food', 'amount' => 1200]);

    Sanctum::actingAs($head);
    $this->deleteJson("/api/assessments/{$assessment->id}")->assertNoContent();

    $this->assertSoftDeleted($assessment);
    // A hard delete would have cascaded the expense lines away with it.
    expect($assessment->expenses()->count())->toBe(1);
});

// ----------------------------------------------------------------- amend

it('reopens a finalized report and increments the revision', function () {
    $head = scsrUser('MSS Head');
    $scsr = startScsr($this->case, $head);
    $this->postJson("/api/cases/{$this->case->id}/social-case/finalize")->assertOk();

    $this->postJson("/api/cases/{$this->case->id}/social-case/amend", ['reason' => 'Corrected household income'])
        ->assertOk()
        ->assertJsonPath('data.social_case_status', 'draft')
        ->assertJsonPath('data.revision', 2);

    $scsr->refresh();
    expect($scsr->noted_at)->toBeNull()
        ->and($scsr->noted_by)->toBeNull()
        ->and($scsr->review_requested_at)->toBeNull();

    // The edit that motivated the amendment now succeeds.
    $this->putJson("/api/cases/{$this->case->id}/social-case", ['total_family_income' => 15000])->assertOk();
});

it('requires a reason to amend', function () {
    $head = scsrUser('MSS Head');
    startScsr($this->case, $head);
    $this->postJson("/api/cases/{$this->case->id}/social-case/finalize")->assertOk();

    $this->postJson("/api/cases/{$this->case->id}/social-case/amend", [])
        ->assertStatus(422)
        ->assertJsonValidationErrors('reason');
});

it('refuses to amend anything but a finalized report', function () {
    $head = scsrUser('MSS Head');
    startScsr($this->case, $head);

    $this->postJson("/api/cases/{$this->case->id}/social-case/amend", ['reason' => 'too early'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('social_case_status');
});

it('keeps one immutable document per finalization, sharing a control number', function () {
    $head = scsrUser('MSS Head');
    $scsr = startScsr($this->case, $head);

    $this->postJson("/api/cases/{$this->case->id}/social-case/finalize")->assertOk();
    $this->postJson("/api/cases/{$this->case->id}/social-case/amend", ['reason' => 'Corrected income'])->assertOk();
    $this->postJson("/api/cases/{$this->case->id}/social-case/finalize")->assertOk();

    $documents = Document::where('case_id', $this->case->id)
        ->where('document_type', 'social_case_study')->orderBy('id')->get();

    $number = $scsr->refresh()->social_case_no;
    expect($documents)->toHaveCount(2)
        ->and($documents[0]->file_name)->toBe("{$number}-r1.pdf")
        ->and($documents[1]->file_name)->toBe("{$number}-r2.pdf");
});

// ------------------------------------------------------------ permissions

it('forbids a case manager from finalizing or amending', function () {
    $worker = scsrUser('Case Manager');
    $head = scsrUser('MSS Head');
    startScsr($this->case, $worker);

    Sanctum::actingAs($worker);
    $this->postJson("/api/cases/{$this->case->id}/social-case/finalize")->assertForbidden();

    Sanctum::actingAs($head);
    $this->postJson("/api/cases/{$this->case->id}/social-case/finalize")->assertOk();

    Sanctum::actingAs($worker);
    $this->postJson("/api/cases/{$this->case->id}/social-case/amend", ['reason' => 'nope'])->assertForbidden();
});

it('lets a supervisor finalize', function () {
    $supervisor = scsrUser('Supervisor');
    startScsr($this->case, $supervisor);

    $this->postJson("/api/cases/{$this->case->id}/social-case/finalize")->assertOk();
});

it('requires cases.view to read the report', function () {
    $head = scsrUser('MSS Head');
    startScsr($this->case, $head);

    $outsider = User::factory()->create();
    Sanctum::actingAs($outsider);
    $this->getJson("/api/cases/{$this->case->id}/social-case")->assertForbidden();
});

it('404s when the case has no social case study', function () {
    Sanctum::actingAs(scsrUser('MSS Head'));

    $this->getJson("/api/cases/{$this->case->id}/social-case")->assertNotFound();
});

// -------------------------------------------------------- control numbers

it('issues sequential SCSR control numbers scoped to the year', function () {
    $head = scsrUser('MSS Head');
    $first = startScsr($this->case, $head);
    $second = startScsr(makeSocialCaseEpisode($this->patient), $head);

    $year = now()->year;
    expect($first->social_case_no)->toBe(sprintf('SCSR-%d-%06d', $year, 1))
        ->and($second->social_case_no)->toBe(sprintf('SCSR-%d-%06d', $year, 2));
});

// -------------------------------------------------- the guarded regression

it('still accepts an intake appended to a case with a finalized report', function () {
    $head = scsrUser('MSS Head');
    startScsr($this->case, $head);
    $this->postJson("/api/cases/{$this->case->id}/social-case/finalize")->assertOk();

    // This is the regression the whole nullable-status design exists to
    // prevent: enforcing one assessment per case would have broken it.
    $appended = makeAssessment($this->case, $head, ['classification' => 'appended intake']);

    expect($appended->exists)->toBeTrue()
        ->and($this->case->socialCase()->first()->social_case_status)->toBe('finalized');
});

// ------------------------------------------------------------- timeline

it('writes one case activity per lifecycle transition', function () {
    $head = scsrUser('MSS Head');
    startScsr($this->case, $head);

    $this->postJson("/api/cases/{$this->case->id}/social-case/submit")->assertOk();
    $this->postJson("/api/cases/{$this->case->id}/social-case/finalize")->assertOk();
    $this->postJson("/api/cases/{$this->case->id}/social-case/amend", ['reason' => 'Wrong income'])->assertOk();

    $types = CaseActivity::where('case_id', $this->case->id)->pluck('activity_type')->all();

    expect($types)->toBe([
        'social_case_started', 'social_case_submitted', 'social_case_finalized', 'social_case_amended',
    ]);

    expect(CaseActivity::where('activity_type', 'social_case_amended')->first()->notes)
        ->toContain('Wrong income');
});
