<?php

namespace App\Services;

use App\Actions\CalculateMswdClassificationAction;
use App\Actions\EnsureWatcherRequirementSatisfied;
use App\DTOs\AssessmentDto;
use App\Models\Assessment;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\User;
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
        protected UisSnapshotService $snapshots,
        protected UisSocioeconomicImporter $socioeconomic,
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

        // The UIS prints the patient's identity and family composition, which are
        // patient-level and keep changing. Freeze them here so a sheet issued from
        // this assessment reprints as it was. See docs/UIS_SNAPSHOT_PLAN.md.
        $interviewedAt = $data['interviewed_at'] ?? $data['encounter_date'] ?? now();
        $householdSize = $this->snapshots->householdSize($patient);

        $data['interviewed_at'] = $interviewedAt;
        $data['interviewed_by'] ??= $data['created_by'] ?? null;
        $data['household_size'] = $householdSize;
        $data['uis_snapshot'] = $this->snapshots->capture($patient, $interviewedAt);
        $data['uis_snapshot_at'] = now();

        // Section III and the family income are recorded once, on the patient's
        // Socio-economic tab. Fill what the request left out from the newest record;
        // anything the request supplied wins. This runs before the classification, so
        // the new assessment is classified against the imported figures.
        // See docs/UIS_SOCIOECONOMIC_IMPORT_PLAN.md.
        [$data, $expenses] = $this->fillFromSocioeconomic($patient, $data, $expenses);

        // Calculate socio-economic metrics against the expense lines being created
        // with the assessment, so one request yields the final classification.
        $metrics = $this->calculateClassification->execute(
            totalFamilyIncome: isset($data['total_family_income']) ? (float) $data['total_family_income'] : null,
            expensesSum: (float) collect($expenses)->sum(fn (array $line) => (float) ($line['amount'] ?? 0)),
            patient: $patient,
            householdSize: $householdSize,
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

    /**
     * Fill the income, living conditions and expense lines a new assessment's request
     * omitted from the patient's newest socio-economic record, stamping which record it
     * was. Nothing the request supplied is overwritten, and a patient with no record
     * imports nothing.
     *
     * @param  array<string, mixed>  $data
     * @param  array<int, array<string, mixed>>  $expenses
     * @return array{0: array<string, mixed>, 1: array<int, array<string, mixed>>}
     */
    private function fillFromSocioeconomic(Patient $patient, array $data, array $expenses): array
    {
        $profile = $this->socioeconomic->latestFor($patient);

        if ($profile === null) {
            return [$data, $expenses];
        }

        $imported = false;

        foreach ($this->socioeconomic->attributes($profile) as $column => $value) {
            if (blank($data[$column] ?? null)) {
                $data[$column] = $value;
                $imported = true;
            }
        }

        if ($expenses === []) {
            $expenses = $this->socioeconomic->expenseLines($profile);
            $imported = $imported || $expenses !== [];
        }

        if ($imported) {
            $data['socioeconomic_profile_id'] = $profile->id;
            $data['socioeconomic_imported_at'] = now();
        }

        return [$data, $expenses];
    }

    public function update(Assessment $assessment, AssessmentDto $dto): Assessment
    {
        $data = $dto->toArray();

        $income = $dto->total_family_income ?? (float) $assessment->total_family_income;
        $expensesSum = (float) $assessment->expenses()->sum('amount');

        // The household size the intake froze, not today's family: editing an
        // assessment must not re-derive its per-capita income against a household
        // that has changed since the interview.
        $metrics = $this->calculateClassification->execute(
            totalFamilyIncome: $income,
            expensesSum: $expensesSum,
            patient: $this->householdOf($assessment),
            householdSize: $assessment->household_size,
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
            householdSize: $assessment->household_size,
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

    /**
     * Replace the frozen UIS copy with the patient's current data, stamped with
     * who asked for it. The intake form collects no family or income — those are
     * filled in on the patient afterwards — so a worker needs a way to pull them
     * onto a sheet that has not been issued yet. The classification follows: a
     * household that grew since the interview changes the per-capita income.
     */
    public function refreshSnapshot(Assessment $assessment, User $worker): Assessment
    {
        $patient = $this->householdOf($assessment);

        if ($patient === null) {
            return $assessment;
        }

        return DB::transaction(function () use ($assessment, $patient, $worker) {
            $assessment->forceFill([
                'uis_snapshot' => $this->snapshots->capture($patient, $assessment->interviewed_at, $assessment),
                'uis_snapshot_at' => now(),
                'uis_snapshot_by' => $worker->id,
                'household_size' => $this->snapshots->householdSize($patient),
            ]);

            $this->importSocioeconomic($assessment, $patient);

            $assessment->save();

            return $this->recalculateClassification($assessment->refresh());
        });
    }

    /**
     * Replace the assessment's income, living conditions and expense lines with the
     * patient's newest socio-economic record. Unlike intake this overwrites: Refresh is
     * "pull the patient record in". A patient with no record leaves the assessment
     * alone, and a record that holds no expense items leaves its lines alone, so a
     * refresh never wipes figures a worker entered.
     */
    private function importSocioeconomic(Assessment $assessment, Patient $patient): void
    {
        $profile = $this->socioeconomic->latestFor($patient);

        if ($profile === null) {
            return;
        }

        $assessment->forceFill($this->socioeconomic->attributes($profile));

        $lines = $this->socioeconomic->expenseLines($profile);

        if ($lines !== []) {
            // Deleted one by one, not in bulk, so each removal reaches the audit trail.
            $assessment->expenses->each->delete();

            foreach ($lines as $line) {
                $assessment->expenses()->create($line);
            }
        }

        $assessment->forceFill([
            'socioeconomic_profile_id' => $profile->id,
            'socioeconomic_imported_at' => now(),
        ]);
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
