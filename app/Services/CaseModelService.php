<?php

namespace App\Services;

use App\DTOs\CaseModelDto;
use App\Models\Assessment;
use App\Models\CaseActivity;
use App\Models\CaseModel;
use App\Models\Document;
use App\Models\User;
use App\Repositories\Contracts\CaseModelRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Activitylog\Models\Activity;

class CaseModelService
{
    public function __construct(protected CaseModelRepositoryInterface $repository) {}

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
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
        return $case->load(['patient', 'assignedUser'])
            ->loadCount(['activities', 'assessments', 'diagnostics', 'interventions', 'documents', 'patientAssistances']);
    }

    /**
     * The field-level audit trail for a case and its audited child records.
     */
    public function history(CaseModel $case): Collection
    {
        $subjects = [
            CaseModel::class => [$case->id],
            Assessment::class => $case->assessments()->pluck('id')->all(),
            Document::class => $case->documents()->pluck('id')->all(),
        ];

        return Activity::query()
            ->where(function ($query) use ($subjects) {
                foreach ($subjects as $type => $ids) {
                    if ($ids === []) {
                        continue;
                    }

                    $query->orWhere(fn ($sub) => $sub
                        ->where('subject_type', (new $type)->getMorphClass())
                        ->whereIn('subject_id', $ids));
                }
            })
            ->with('causer')
            ->latest()
            ->get();
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
