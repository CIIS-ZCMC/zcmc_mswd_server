<?php

namespace App\Services;

use App\Actions\EnsureWatcherRequirementSatisfied;
use App\DTOs\AssessmentDto;
use App\Models\Assessment;
use App\Models\CaseModel;
use App\Repositories\Contracts\AssessmentRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Validation\ValidationException;

class AssessmentService
{
    public function __construct(
        protected AssessmentRepositoryInterface $repository,
        protected EnsureWatcherRequirementSatisfied $ensureWatcherRequirement,
    ) {}

    public function list(int $page = 1, int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($page, $perPage);
    }

    public function find(int|string $id): Assessment
    {
        return $this->repository->findOrFail($id);
    }

    public function create(AssessmentDto $dto): Assessment
    {
        ($this->ensureWatcherRequirement)(CaseModel::findOrFail($dto->case_id), 'have an assessment recorded');

        return $this->repository->create($dto->toArray());
    }

    public function update(Assessment $assessment, AssessmentDto $dto): Assessment
    {
        return $this->repository->update($assessment, $dto->toArray());
    }

    /**
     * Soft-deletes, since Assessment mixes in SoftDeletes. A finalized social
     * case study is a signed document and is refused outright, mirroring
     * UnifiedIntakeSheetService::cancel().
     */
    public function delete(Assessment $assessment): bool
    {
        if ($assessment->social_case_status === Assessment::SOCIAL_CASE_FINALIZED) {
            throw ValidationException::withMessages([
                'social_case_status' => 'A finalized social case study cannot be deleted.',
            ]);
        }

        return $this->repository->delete($assessment);
    }
}
