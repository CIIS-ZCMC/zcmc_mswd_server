<?php

namespace App\Services;

use App\DTOs\AssessmentDto;
use App\Models\Assessment;
use App\Models\Bizbox\PatientTransaction;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * The Intake Assessment (UIS) taken for a patient's HIS encounter, with or
 * without a case. One per encounter, like a case; a case opened on that
 * encounter later picks it up (linkCase). See docs/INTAKE_ASSESSMENT_PLAN.md.
 */
class IntakeAssessmentService
{
    public function __construct(
        protected AssessmentService $assessments,
        protected PatientTransactionService $transactions,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes  the assessment fields and expense lines (StoreAssessmentRequest)
     */
    public function create(Patient $patient, int $transactionId, array $attributes, User $author): Assessment
    {
        if (Assessment::intakeFor($patient->id, $transactionId)->exists()) {
            throw ValidationException::withMessages([
                'his_transaction_id' => 'This hospital encounter already has an intake assessment.',
            ]);
        }

        $encounter = $this->encounterOf($patient, $transactionId);
        $case = CaseModel::where('transaction_id', $transactionId)->where('patient_id', $patient->id)->first();

        return $this->assessments->create(
            AssessmentDto::fromArray(array_merge($attributes, [
                'created_by' => $author->id,
                // An encounter that already has a case links straight away.
                'case_id' => $case?->id,
            ])),
            [
                'patient_id' => $patient->id,
                'his_transaction_id' => $transactionId,
                'transaction_type' => $encounter->transactionType?->description ?: $encounter->pattrantype,
                'encounter_date' => $encounter->registrydate,
            ],
        );
    }

    /**
     * A case just opened on an encounter takes over that encounter's intake.
     */
    public function linkCase(CaseModel $case): void
    {
        if (blank($case->transaction_id)) {
            return;
        }

        Assessment::query()
            ->where('patient_id', $case->patient_id)
            ->where('his_transaction_id', $case->transaction_id)
            ->whereNull('case_id')
            ->update(['case_id' => $case->id]);
    }

    /**
     * The HIS encounter, checked to be this patient's. An unknown encounter or
     * an unreachable HIS answers 422 rather than 500, as opening a case does.
     */
    private function encounterOf(Patient $patient, int $transactionId): PatientTransaction
    {
        try {
            $encounter = $this->transactions->find($transactionId);
        } catch (\Throwable $e) {
            report($e);

            throw ValidationException::withMessages([
                'his_transaction_id' => 'This hospital encounter could not be found.',
            ]);
        }

        if (blank($patient->hospital_id) || (string) $encounter->patient?->patid !== (string) $patient->hospital_id) {
            throw ValidationException::withMessages([
                'his_transaction_id' => 'This hospital encounter belongs to another patient.',
            ]);
        }

        return $encounter;
    }
}
