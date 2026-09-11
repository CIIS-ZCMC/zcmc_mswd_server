<?php

namespace App\Services;

use App\DTOs\CaseProgressNoteDto;
use App\Models\CaseActivity;
use App\Models\CaseModel;
use App\Models\CaseProgressNote;
use App\Models\User;
use App\Repositories\Contracts\CaseProgressNoteRepositoryInterface;
use App\Support\ListQuery;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CaseProgressNoteService
{
    public function __construct(protected CaseProgressNoteRepositoryInterface $repository) {}

    public function listForCase(CaseModel $case, ListQuery $query): LengthAwarePaginator
    {
        return $this->repository->paginateList(new ListQuery(
            page: $query->page,
            perPage: $query->perPage,
            search: $query->search,
            sort: $query->sort,
            direction: $query->direction,
            filters: array_merge($query->filters, ['case_id' => $case->id]),
            trashed: $query->trashed,
        ));
    }

    public function create(CaseModel $case, User $author, CaseProgressNoteDto $dto): CaseProgressNote
    {
        if ($case->trashed()) {
            throw ValidationException::withMessages([
                'case_id' => 'An archived case cannot take new progress notes.',
            ]);
        }

        return DB::transaction(function () use ($case, $author, $dto) {
            /** @var CaseProgressNote $note */
            $note = $this->repository->create(array_merge($dto->toArray(), [
                'case_id' => $case->id,
                'author_id' => $author->id,
                // Links to the case's social case study when there is one, so
                // the report and its running narrative stay together.
                'assessment_id' => $case->socialCase()->value('id'),
                'note_date' => $dto->note_date ?? now()->toDateString(),
                'note_type' => $dto->note_type ?? CaseProgressNote::TYPE_PROGRESS,
            ]));

            // One line on the milestone timeline, so the chronology stays
            // complete without duplicating the narrative into an append-only
            // table that has no audit trail of its own.
            $this->recordActivity($case, $author, 'progress_note_added', "{$note->note_type} note recorded");

            return $note->load('author');
        });
    }

    public function update(CaseProgressNote $note, User $actor, CaseProgressNoteDto $dto): CaseProgressNote
    {
        $this->assertMayWrite($note, $actor);

        return $this->repository->update($note, $dto->toArray())->load('author');
    }

    public function delete(CaseProgressNote $note, User $actor): bool
    {
        $this->assertMayWrite($note, $actor);

        return $this->repository->delete($note);
    }

    public function completeFollowUp(CaseProgressNote $note, User $actor): CaseProgressNote
    {
        if ($note->follow_up_on === null) {
            throw ValidationException::withMessages([
                'follow_up_on' => 'This note has no follow-up to complete.',
            ]);
        }

        if ($note->follow_up_done_at !== null) {
            throw ValidationException::withMessages([
                'follow_up_done_at' => 'This follow-up is already marked done.',
            ]);
        }

        return $this->repository->update($note, [
            'follow_up_done_at' => now(),
            'follow_up_done_by' => $actor->id,
        ])->load(['author', 'followUpDoneBy']);
    }

    /**
     * The actor's own outstanding follow-ups — due today or overdue — on cases
     * still being worked. Completed follow-ups and closed cases drop out.
     *
     * @return Collection<int, CaseProgressNote>
     */
    public function dueFollowUps(User $actor): Collection
    {
        return CaseProgressNote::query()
            ->where('author_id', $actor->id)
            ->whereNotNull('follow_up_on')
            ->whereNull('follow_up_done_at')
            ->whereDate('follow_up_on', '<=', now()->toDateString())
            ->whereHas('case', fn ($q) => $q->whereIn('status', CaseModelService::CASELOAD_DEFAULT_STATUSES))
            ->with(['author', 'case.patient'])
            ->orderBy('follow_up_on')
            ->get();
    }

    /**
     * Clinical narrative is attributable: a colleague silently rewriting
     * someone else's note is the failure mode to prevent. A supervisor holding
     * cases.delete can still override, and the audit log makes that
     * accountable.
     */
    private function assertMayWrite(CaseProgressNote $note, User $actor): void
    {
        if ($note->author_id === $actor->id || $actor->can('cases.delete')) {
            return;
        }

        throw new AuthorizationException('Only the note\'s author can change it.');
    }

    private function recordActivity(CaseModel $case, User $user, string $type, ?string $notes = null): void
    {
        CaseActivity::create([
            'case_id' => $case->id,
            'assigned_user_id' => $user->id,
            'activity_type' => $type,
            'activity_date' => now(),
            'notes' => $notes,
        ]);
    }
}
