<?php

namespace App\Services;

use App\Actions\CalculateMswdClassificationAction;
use App\Actions\EnsureWatcherRequirementSatisfied;
use App\DTOs\AssessmentDto;
use App\Models\Assessment;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Repositories\Contracts\AssessmentRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
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

    /**
     * @param  array<string, mixed>  $encounter  an intake with no case: its
     *                                           patient_id, his_transaction_id and HIS labels (IntakeAssessmentService)
     */
    public function create(AssessmentDto $dto, array $encounter = []): Assessment
    {
        $case = $dto->case_id === null ? null : CaseModel::with(['patient.familyMembers'])->findOrFail($dto->case_id);

        if ($case !== null) {
            ($this->ensureWatcherRequirement)($case, 'have an assessment recorded');
        }

        $patient = $case?->patient ?? Patient::findOrFail($encounter['patient_id']);

        $data = array_merge($dto->toArray(), $encounter);
        $expenses = $dto->expenses ?? [];

        // Calculate socio-economic metrics against the expense lines being created
        // with the assessment, so one request yields the final classification.
        $metrics = $this->calculateClassification->execute(
            totalFamilyIncome: $dto->total_family_income,
            expensesSum: (float) collect($expenses)->sum(fn (array $line) => (float) ($line['amount'] ?? 0)),
            patient: $patient,
        );

        $data['net_per_capita_income'] = $metrics['net_per_capita_income'];
        $data['calculated_classification'] = $metrics['calculated_classification'];
        $data['calculated_discount_rate'] = $metrics['calculated_discount_rate'];

        if (empty($data['classification'])) {
            $data['classification'] = $metrics['calculated_classification'];
        }

        return DB::transaction(function () use ($data, $expenses) {
            $assessment = $this->repository->create($data);

            foreach ($expenses as $line) {
                $assessment->expenses()->create([
                    'expense_type' => $line['expense_type'],
                    'amount' => $line['amount'],
                ]);
            }

            return $assessment->load('expenses');
        });
    }

    public function update(Assessment $assessment, AssessmentDto $dto): Assessment
    {
        $data = $dto->toArray();

        $income = $dto->total_family_income ?? (float) $assessment->total_family_income;
        $expensesSum = (float) $assessment->expenses()->sum('amount');

        $metrics = $this->calculateClassification->execute(
            totalFamilyIncome: $income,
            expensesSum: $expensesSum,
            patient: $this->householdOf($assessment),
        );

        $data['net_per_capita_income'] = $metrics['net_per_capita_income'];
        $data['calculated_classification'] = $metrics['calculated_classification'];
        $data['calculated_discount_rate'] = $metrics['calculated_discount_rate'];

        // The column is NOT NULL: a missing classification, or one explicitly
        // cleared by the client, falls back to the calculated one.
        if ((! isset($data['classification']) && empty($assessment->classification))
            || (array_key_exists('classification', $data) && blank($data['classification']))) {
            $data['classification'] = $metrics['calculated_classification'];
        }

        return $this->repository->update($assessment, $data);
    }

    /**
     * Re-derives the classification metrics from the current income and expense
     * lines. Expenses are added after the assessment exists, so create() can only
     * classify against zero expenses; the expense writes call this to catch up.
     *
     * A manual override is respected: when the worker's classification already
     * differs from the previous calculation (or carries an override reason) it is
     * left alone and only the calculated_* columns move.
     */
    public function recalculateClassification(Assessment $assessment): Assessment
    {
        $hadOverride = $assessment->hasOverride();

        $metrics = $this->calculateClassification->execute(
            totalFamilyIncome: (float) $assessment->total_family_income,
            expensesSum: (float) $assessment->expenses()->sum('amount'),
            patient: $this->householdOf($assessment),
        );

        $data = [
            'net_per_capita_income' => $metrics['net_per_capita_income'],
            'calculated_classification' => $metrics['calculated_classification'],
            'calculated_discount_rate' => $metrics['calculated_discount_rate'],
        ];

        if (! $hadOverride) {
            $data['classification'] = $metrics['calculated_classification'];
        }

        return $this->repository->update($assessment, $data);
    }

    /** The patient whose household the classification counts. */
    private function householdOf(Assessment $assessment): ?Patient
    {
        return $assessment->patient ?? $assessment->case?->patient;
    }

    public function createReassessment(CaseModel $case, AssessmentDto $dto, string $reason): Assessment
    {
        $parent = $case->assessments()->latest()->latest('id')->first();

        $data = array_merge($dto->toArray(), [
            'case_id' => $case->id,
            'parent_assessment_id' => $parent?->id,
            'reassessment_reason' => $reason,
            // toArray() leaves expense lines out (not a column); carry them to create().
            'expenses' => $dto->expenses,
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
     * case study is a signed document and is refused outright.
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
