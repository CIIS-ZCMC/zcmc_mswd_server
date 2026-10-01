<?php

namespace App\Services;

use App\DTOs\AssessmentExpenseDto;
use App\Models\Assessment;
use App\Models\AssessmentExpense;
use App\Repositories\Contracts\AssessmentExpenseRepositoryInterface;
use Illuminate\Validation\ValidationException;

/**
 * Household expense lines under an assessment — the table the SCSR's economic
 * section prints against total_family_income.
 *
 * Every write checks the parent: a line item on a signed report is part of that
 * signed report, so it is frozen with it.
 */
class AssessmentExpenseService
{
    public function __construct(
        protected AssessmentExpenseRepositoryInterface $repository,
        protected AssessmentService $assessments,
    ) {}

    public function create(Assessment $assessment, AssessmentExpenseDto $dto): AssessmentExpense
    {
        $this->assertParentEditable($assessment);

        $expense = $this->repository->create(array_merge($dto->toArray(), [
            'assessment_id' => $assessment->id,
        ]));

        $this->assessments->recalculateClassification($assessment);

        return $expense;
    }

    public function update(AssessmentExpense $expense, AssessmentExpenseDto $dto): AssessmentExpense
    {
        $this->assertParentEditable($expense->assessment);

        $expense = $this->repository->update($expense, $dto->toArray());

        $this->assessments->recalculateClassification($expense->assessment);

        return $expense;
    }

    public function delete(AssessmentExpense $expense): bool
    {
        $this->assertParentEditable($expense->assessment);

        $assessment = $expense->assessment;
        $deleted = $this->repository->delete($expense);

        $this->assessments->recalculateClassification($assessment);

        return $deleted;
    }

    private function assertParentEditable(?Assessment $assessment): void
    {
        if ($assessment?->social_case_status === Assessment::SOCIAL_CASE_FINALIZED) {
            throw ValidationException::withMessages([
                'assessment_id' => 'A finalized social case study must be amended before its expenses can be changed.',
            ]);
        }
    }
}
