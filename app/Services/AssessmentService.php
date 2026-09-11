<?php

namespace App\Services;

use App\Actions\CalculateMswdClassificationAction;
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
        protected CalculateMswdClassificationAction $calculateClassification,
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
        $case = CaseModel::with(['patient.familyMembers'])->findOrFail($dto->case_id);
        ($this->ensureWatcherRequirement)($case, 'have an assessment recorded');

        $data = $dto->toArray();

        // Calculate socio-economic metrics
        $metrics = $this->calculateClassification->execute(
            totalFamilyIncome: $dto->total_family_income,
            expensesSum: 0.0,
            case: $case,
        );

        $data['net_per_capita_income'] = $metrics['net_per_capita_income'];
        $data['calculated_classification'] = $metrics['calculated_classification'];
        $data['calculated_discount_rate'] = $metrics['calculated_discount_rate'];

        if (empty($data['classification'])) {
            $data['classification'] = $metrics['calculated_classification'];
        }

        $assessment = $this->repository->create($data);

        return $assessment;
    }

    public function update(Assessment $assessment, AssessmentDto $dto): Assessment
    {
        $data = $dto->toArray();
        $case = $assessment->case()->with(['patient.familyMembers'])->first();

        $income = $dto->total_family_income ?? (float) $assessment->total_family_income;
        $expensesSum = (float) $assessment->expenses()->sum('amount');

        $metrics = $this->calculateClassification->execute(
            totalFamilyIncome: $income,
            expensesSum: $expensesSum,
            case: $case,
        );

        $data['net_per_capita_income'] = $metrics['net_per_capita_income'];
        $data['calculated_classification'] = $metrics['calculated_classification'];
        $data['calculated_discount_rate'] = $metrics['calculated_discount_rate'];

        if (! isset($data['classification']) && empty($assessment->classification)) {
            $data['classification'] = $metrics['calculated_classification'];
        }

        return $this->repository->update($assessment, $data);
    }

    public function createReassessment(CaseModel $case, AssessmentDto $dto, string $reason): Assessment
    {
        $parent = $case->assessments()->latest()->first();

        $data = array_merge($dto->toArray(), [
            'case_id' => $case->id,
            'parent_assessment_id' => $parent?->id,
            'reassessment_reason' => $reason,
        ]);

        return $this->create(AssessmentDto::fromArray($data));
    }

    public function promoteToSocialCase(Assessment $assessment, int $userId): Assessment
    {
        if ($assessment->isSocialCase()) {
            return $assessment;
        }

        $assessment->update([
            'social_case_status' => Assessment::SOCIAL_CASE_DRAFT,
            'prepared_by' => $userId,
            'prepared_at' => now(),
        ]);

        return $assessment->fresh();
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
