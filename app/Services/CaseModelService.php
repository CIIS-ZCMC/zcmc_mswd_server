<?php

namespace App\Services;

use App\Actions\EnsureWatcherRequirementSatisfied;
use App\DTOs\CaseModelDto;
use App\Models\CaseActivity;
use App\Models\CaseModel;
use App\Models\User;
use App\Repositories\Contracts\CaseModelRepositoryInterface;
use App\Support\ListQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CaseModelService
{
    /**
     * Ceiling on the unpaginated history read — see the note on
     * {@see PatientService::HISTORY_LIMIT}.
     */
    private const HISTORY_LIMIT = 200;

    public function __construct(
        protected CaseModelRepositoryInterface $repository,
        protected EnsureWatcherRequirementSatisfied $ensureWatcherRequirement,
    ) {}

    public function list(?ListQuery $query = null): LengthAwarePaginator
    {
        return $this->repository->paginateList($query ?? new ListQuery);
    }

    public function find(int|string $id): CaseModel
    {
        return $this->repository->findOrFail($id);
    }

    /**
     * Open a case: generate the code, apply defaults, and log the milestone.
     */
    public function create(CaseModelDto $dto, User $worker): CaseModel
    {
        return DB::transaction(function () use ($dto, $worker) {
            $attributes = $dto->toArray();
            $attributes['case_code'] ??= $this->nextCaseCode();
            $attributes['assigned_user_id'] ??= $worker->id;
            $attributes['status'] ??= CaseModel::STATUS_OPEN;
            $attributes['date_opened'] ??= now();

            /** @var CaseModel $case */
            $case = $this->repository->create($attributes);

            $this->recordActivity($case, $worker, 'case_opened', "Case {$case->case_code} opened");

            return $case;
        });
    }

    public function update(CaseModel $case, CaseModelDto $dto): CaseModel
    {
        return $this->repository->update($case, $dto->toArray());
    }

    /**
     * (Re)assign the case to a worker, recording the previous assignee.
     */
    public function assign(CaseModel $case, User $newWorker, User $actor): CaseModel
    {
        return DB::transaction(function () use ($case, $newWorker) {
            $previousId = $case->assigned_user_id;

            /** @var CaseModel $case */
            $case = $this->repository->update($case, ['assigned_user_id' => $newWorker->id]);

            CaseActivity::create([
                'case_id' => $case->id,
                'assigned_user_id' => $newWorker->id,
                'previous_user_id' => $previousId,
                'activity_type' => 'case_reassigned',
                'activity_date' => now(),
                'notes' => "Reassigned to {$newWorker->employee_name}",
            ]);

            return $case;
        });
    }

    public function close(CaseModel $case, User $actor): CaseModel
    {
        if ($case->status === CaseModel::STATUS_CLOSED) {
            throw ValidationException::withMessages(['status' => 'This case is already closed.']);
        }

        ($this->ensureWatcherRequirement)($case, 'be closed');

        return DB::transaction(function () use ($case, $actor) {
            /** @var CaseModel $case */
            $case = $this->repository->update($case, [
                'status' => CaseModel::STATUS_CLOSED,
                'date_closed' => now(),
            ]);
            $this->recordActivity($case, $actor, 'case_closed', "Case {$case->case_code} closed");

            return $case;
        });
    }

    public function refer(CaseModel $case, User $actor, ?string $notes = null): CaseModel
    {
        return DB::transaction(function () use ($case, $actor, $notes) {
            /** @var CaseModel $case */
            $case = $this->repository->update($case, ['status' => CaseModel::STATUS_REFERRED]);
            $this->recordActivity($case, $actor, 'case_referred', $notes ?? "Case {$case->case_code} referred");

            return $case;
        });
    }

    public function reopen(CaseModel $case, User $actor): CaseModel
    {
        return DB::transaction(function () use ($case, $actor) {
            /** @var CaseModel $case */
            $case = $this->repository->update($case, [
                'status' => CaseModel::STATUS_ONGOING,
                'date_closed' => null,
            ]);
            $this->recordActivity($case, $actor, 'case_reopened', "Case {$case->case_code} reopened");

            return $case;
        });
    }

    /**
     * Soft-archive a case. Only a closed or referred case may be archived.
     */
    public function archive(CaseModel $case): bool
    {
        if (! $case->isArchivable()) {
            throw ValidationException::withMessages([
                'case' => 'Only a closed or referred case can be archived.',
            ]);
        }

        return $this->repository->delete($case);
    }

    public function restore(int|string $id): CaseModel
    {
        $case = CaseModel::withTrashed()->findOrFail($id);
        $case->restore();

        return $case;
    }

    /**
     * The case with its patient, worker, and record counts for the profile view.
     */
    public function profile(CaseModel $case): CaseModel
    {
        return $case->load(['patient', 'assignedUser', 'watchers.addedBy'])
            ->loadCount(['activities', 'assessments', 'diagnostics', 'interventions', 'documents', 'patientAssistances']);
    }

    /**
     * The case's audit trail, newest first.
     *
     * Reads the stamped `case_id` instead of fanning out over subject types, so
     * this is one indexed query — and it now reaches every audited record on the
     * episode (interventions, diagnostics, expense lines, assistance) rather
     * than just the case, its assessments and its documents.
     *
     * Returns a Collection, not a paginator: `GET /cases/{case}/history` is an
     * unpaginated array by contract, so the wider reach is capped here.
     */
    public function history(CaseModel $case, ?User $viewer = null): Collection
    {
        return app(ActivityLogService::class)->collect(
            ['case_id' => $case->id],
            $viewer,
            self::HISTORY_LIMIT,
        );
    }

    /**
     * Record a milestone on the case timeline (used by clinical sub-records
     * such as assessments, diagnostics and interventions).
     */
    public function logMilestone(CaseModel $case, User $user, string $type, ?string $notes = null): void
    {
        $this->recordActivity($case, $user, $type, $notes);
    }

    private function nextCaseCode(): string
    {
        $year = now()->year;
        $sequence = CaseModel::withTrashed()->whereYear('created_at', $year)->count() + 1;

        return sprintf('CASE-%d-%06d', $year, $sequence);
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
