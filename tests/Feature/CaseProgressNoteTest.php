<?php

use App\DTOs\CaseProgressNoteDto;
use App\Models\Assessment;
use App\Models\CaseActivity;
use App\Models\CaseModel;
use App\Models\CaseProgressNote;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use App\Services\CaseProgressNoteService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->worker = User::factory()->create(['role' => 'Case Manager']);
    $this->worker->assignRole('Case Manager');

    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->patient = Patient::create([
        'sector_id' => $this->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
    ]);
    $this->case = noteCase($this->worker, $this->patient);

    Sanctum::actingAs($this->worker);
});

function noteCase(User $owner, Patient $patient, array $overrides = []): CaseModel
{
    return CaseModel::create(array_merge([
        'patient_id' => $patient->id,
        'assigned_user_id' => $owner->id,
        'case_code' => 'CASE-'.uniqid(),
        'case_type' => 'medical',
        'priority_level' => 'high',
        'status' => CaseModel::STATUS_OPEN,
        'admission_type' => 'OPD',
        'date_opened' => now(),
    ], $overrides));
}

it('records a progress note', function () {
    $response = $this->postJson("/api/cases/{$this->case->id}/progress-notes", [
        'note_type' => 'phone_follow_up',
        'narrative' => 'Phoned the daughter, still no funds, following up Monday.',
        'follow_up_on' => now()->addDays(3)->toDateString(),
    ])->assertCreated();

    expect($response->json('data.note_type'))->toBe('phone_follow_up')
        ->and($response->json('data.narrative'))->toContain('still no funds')
        ->and($response->json('data.has_open_follow_up'))->toBeTrue()
        ->and($response->json('data.author.id'))->toBe($this->worker->id)
        // Defaults to today when the worker does not backdate it.
        ->and($response->json('data.note_date'))->toBe(now()->toDateString());
});

it('defaults the note type to progress', function () {
    $response = $this->postJson("/api/cases/{$this->case->id}/progress-notes", [
        'narrative' => 'Case conference scheduled.',
    ])->assertCreated();

    expect($response->json('data.note_type'))->toBe('progress');
});

it('validates the payload', function () {
    $this->postJson("/api/cases/{$this->case->id}/progress-notes", ['note_type' => 'nonsense'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['narrative', 'note_type']);
});

it('lists a case\'s notes, newest first', function () {
    $this->postJson("/api/cases/{$this->case->id}/progress-notes", [
        'narrative' => 'Older', 'note_date' => now()->subWeek()->toDateString(),
    ])->assertCreated();
    $this->postJson("/api/cases/{$this->case->id}/progress-notes", [
        'narrative' => 'Newer', 'note_date' => now()->toDateString(),
    ])->assertCreated();

    // Another case's notes must not leak in.
    $other = noteCase($this->worker, $this->patient);
    $this->postJson("/api/cases/{$other->id}/progress-notes", ['narrative' => 'Elsewhere'])->assertCreated();

    $response = $this->getJson("/api/cases/{$this->case->id}/progress-notes")->assertOk();

    expect($response->json('data'))->toHaveCount(2)
        ->and($response->json('data.0.narrative'))->toBe('Newer');
});

it('links a note to the case\'s social case study when one exists', function () {
    $scsr = Assessment::create([
        'case_id' => $this->case->id, 'created_by' => $this->worker->id,
        'classification' => 'indigent', 'social_case_status' => Assessment::SOCIAL_CASE_DRAFT,
        'social_case_no' => 'SCSR-2026-000001',
    ]);

    $response = $this->postJson("/api/cases/{$this->case->id}/progress-notes", [
        'narrative' => 'Home visit conducted.',
    ])->assertCreated();

    expect($response->json('data.assessment_id'))->toBe($scsr->id);
});

it('leaves the link null when the case has no social case study', function () {
    // An ordinary assessment is not the case's report, so it must not be linked.
    Assessment::create([
        'case_id' => $this->case->id, 'created_by' => $this->worker->id, 'classification' => 'indigent',
    ]);

    $response = $this->postJson("/api/cases/{$this->case->id}/progress-notes", [
        'narrative' => 'Home visit conducted.',
    ])->assertCreated();

    expect($response->json('data.assessment_id'))->toBeNull();
});

it('refuses a note on an archived case', function () {
    $this->case->update(['status' => CaseModel::STATUS_CLOSED]);
    $this->case->delete();

    // Over HTTP the route binding rejects a soft-deleted case first, so the
    // endpoint never reaches the guard.
    $this->postJson("/api/cases/{$this->case->id}/progress-notes", ['narrative' => 'Too late.'])
        ->assertNotFound();

    // The guard itself lives in the service, where Filament and artisan reach
    // it too — that is the path worth locking.
    expect(fn () => app(CaseProgressNoteService::class)->create(
        $this->case->fresh(),
        $this->worker,
        CaseProgressNoteDto::fromArray(['narrative' => 'Too late.']),
    ))->toThrow(ValidationException::class, 'An archived case cannot take new progress notes.');
});

it('lets the author edit and delete their own note', function () {
    $id = $this->postJson("/api/cases/{$this->case->id}/progress-notes", [
        'narrative' => 'First pass.', 'follow_up_on' => now()->addDay()->toDateString(),
    ])->assertCreated()->json('data.id');

    $this->putJson("/api/progress-notes/{$id}", ['narrative' => 'Corrected account.'])
        ->assertOk()
        ->assertJsonPath('data.narrative', 'Corrected account.');

    // An explicit null clears a follow-up that is no longer owed.
    $this->putJson("/api/progress-notes/{$id}", ['follow_up_on' => null])
        ->assertOk()
        ->assertJsonPath('data.follow_up_on', null);

    $this->deleteJson("/api/progress-notes/{$id}")->assertNoContent();
    $this->assertSoftDeleted('case_progress_notes', ['id' => $id]);
});

it('forbids a colleague from rewriting someone else\'s note', function () {
    $id = $this->postJson("/api/cases/{$this->case->id}/progress-notes", ['narrative' => 'Mine.'])
        ->assertCreated()->json('data.id');

    $colleague = User::factory()->create(['role' => 'Case Manager']);
    $colleague->assignRole('Case Manager'); // cases.update but not cases.delete
    Sanctum::actingAs($colleague);

    $this->putJson("/api/progress-notes/{$id}", ['narrative' => 'Rewritten.'])->assertForbidden();
    $this->deleteJson("/api/progress-notes/{$id}")->assertForbidden();

    expect(CaseProgressNote::find($id)->narrative)->toBe('Mine.');
});

it('lets a supervisor override, accountably', function () {
    $id = $this->postJson("/api/cases/{$this->case->id}/progress-notes", ['narrative' => 'Mine.'])
        ->assertCreated()->json('data.id');

    $supervisor = User::factory()->create(['role' => 'Supervisor']);
    $supervisor->assignRole('Supervisor'); // holds cases.delete
    Sanctum::actingAs($supervisor);

    $this->putJson("/api/progress-notes/{$id}", ['narrative' => 'Corrected by supervisor.'])->assertOk();
    $this->deleteJson("/api/progress-notes/{$id}")->assertNoContent();
});

// ------------------------------------------------------------- follow-ups

it('completes a follow-up once', function () {
    $id = $this->postJson("/api/cases/{$this->case->id}/progress-notes", [
        'narrative' => 'Awaiting PCSO reply.', 'follow_up_on' => now()->toDateString(),
    ])->assertCreated()->json('data.id');

    $this->postJson("/api/progress-notes/{$id}/complete-follow-up")
        ->assertOk()
        ->assertJsonPath('data.has_open_follow_up', false)
        ->assertJsonPath('data.follow_up_done_by.id', $this->worker->id);

    $this->postJson("/api/progress-notes/{$id}/complete-follow-up")
        ->assertStatus(422)
        ->assertJsonValidationErrors('follow_up_done_at');
});

it('refuses to complete a follow-up on a note that has none', function () {
    $id = $this->postJson("/api/cases/{$this->case->id}/progress-notes", ['narrative' => 'No follow-up owed.'])
        ->assertCreated()->json('data.id');

    $this->postJson("/api/progress-notes/{$id}/complete-follow-up")
        ->assertStatus(422)
        ->assertJsonValidationErrors('follow_up_on');
});

it('returns only the actor\'s due and overdue follow-ups', function () {
    // Due today and overdue — both belong on the worklist.
    $this->postJson("/api/cases/{$this->case->id}/progress-notes", [
        'narrative' => 'Due today.', 'follow_up_on' => now()->toDateString(),
    ])->assertCreated();
    $this->postJson("/api/cases/{$this->case->id}/progress-notes", [
        'narrative' => 'Overdue.', 'follow_up_on' => now()->subWeek()->toDateString(),
    ])->assertCreated();

    // Not yet due.
    $this->postJson("/api/cases/{$this->case->id}/progress-notes", [
        'narrative' => 'Next month.', 'follow_up_on' => now()->addMonth()->toDateString(),
    ])->assertCreated();

    // Already completed.
    $done = $this->postJson("/api/cases/{$this->case->id}/progress-notes", [
        'narrative' => 'Handled.', 'follow_up_on' => now()->toDateString(),
    ])->assertCreated()->json('data.id');
    $this->postJson("/api/progress-notes/{$done}/complete-follow-up")->assertOk();

    // On a closed case.
    $closed = noteCase($this->worker, $this->patient);
    $this->postJson("/api/cases/{$closed->id}/progress-notes", [
        'narrative' => 'Case since closed.', 'follow_up_on' => now()->toDateString(),
    ])->assertCreated();
    $closed->update(['status' => CaseModel::STATUS_CLOSED]);

    // Someone else's.
    $colleague = User::factory()->create(['role' => 'Case Manager']);
    $colleague->assignRole('Case Manager');
    $colleagueCase = noteCase($colleague, $this->patient);
    Sanctum::actingAs($colleague);
    $this->postJson("/api/cases/{$colleagueCase->id}/progress-notes", [
        'narrative' => 'Theirs.', 'follow_up_on' => now()->toDateString(),
    ])->assertCreated();

    Sanctum::actingAs($this->worker);
    $response = $this->getJson('/api/my-follow-ups')->assertOk();

    $narratives = array_column($response->json('data'), 'narrative');
    expect($narratives)->toBe(['Overdue.', 'Due today.']); // oldest owed first
});

it('requires cases.view for the follow-up worklist', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->getJson('/api/my-follow-ups')->assertForbidden();
});

// --------------------------------------------------------------- timeline

it('writes exactly one case activity per note', function () {
    $this->postJson("/api/cases/{$this->case->id}/progress-notes", ['narrative' => 'One.'])->assertCreated();
    $this->postJson("/api/cases/{$this->case->id}/progress-notes", ['narrative' => 'Two.'])->assertCreated();

    expect(CaseActivity::where('case_id', $this->case->id)->where('activity_type', 'progress_note_added')->count())
        ->toBe(2);

    // The narrative itself stays out of the append-only timeline.
    expect(CaseActivity::where('activity_type', 'progress_note_added')->first()->notes)
        ->not->toContain('One.');
});
