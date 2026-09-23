<?php

namespace App\Services;

use App\Http\Resources\PatientTransactionResource;
use App\Models\Bizbox\PatientTransaction;
use App\Models\CaseHospitalTransaction;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CaseHospitalTransactionService
{
    public function __construct(
        protected PatientTransactionService $transactions,
        protected CaseModelService $cases,
    ) {}

    /**
     * Attach a hospital (HIS) encounter to a case, freezing a curated snapshot.
     *
     * The encounter is read live from the HIS and never copied wholesale — only
     * the link and its snapshot persist. Idempotent for the same case; guarded
     * against cross-patient and cross-case attaches.
     */
    public function attach(CaseModel $case, int|string $hisTransactionId, User $worker): CaseHospitalTransaction
    {
        $transaction = $this->transactions->find($hisTransactionId);

        $this->guard($case, $transaction);

        $existing = CaseHospitalTransaction::where('his_transaction_id', $transaction->getKey())->first();

        if ($existing !== null) {
            if ($existing->case_id !== $case->id) {
                throw ValidationException::withMessages([
                    'his_transaction_id' => 'This hospital encounter is already attached to another case.',
                ]);
            }

            return $existing;
        }

        return DB::transaction(function () use ($case, $transaction, $worker) {
            $link = CaseHospitalTransaction::create([
                'case_id' => $case->id,
                'his_transaction_id' => $transaction->getKey(),
                'hospital_id' => $transaction->patient?->patid,
                'snapshot' => $this->snapshot($transaction),
                'linked_by' => $worker->id,
                'linked_at' => now(),
            ]);

            $this->cases->logMilestone(
                $case,
                $worker,
                'hospital_transaction_linked',
                "Hospital encounter #{$transaction->getKey()} attached",
            );

            return $link;
        });
    }

    /**
     * The local patient a HIS encounter maps to (by hospital number), or null
     * when that patient has not been imported.
     */
    public function localPatientFor(PatientTransaction $transaction): ?Patient
    {
        $hospitalNumber = $transaction->patient?->patid;

        if (blank($hospitalNumber)) {
            return null;
        }

        return Patient::where('hospital_id', $hospitalNumber)->first();
    }

    /**
     * The open/ongoing cases a HIS encounter can be assessed into: the encounter
     * patient's own live cases, newest first. Empty when the patient is not local
     * or has no open case — a normal state, not an error.
     *
     * @return Collection<int, CaseModel>
     */
    public function assignableCasesFor(PatientTransaction $transaction): Collection
    {
        $patient = $this->localPatientFor($transaction);

        if ($patient === null) {
            return new Collection;
        }

        return $patient->cases()
            ->whereIn('status', CaseModelService::CASELOAD_DEFAULT_STATUSES)
            ->orderByDesc('date_opened')
            ->get();
    }

    public function detach(CaseHospitalTransaction $link, User $worker): void
    {
        DB::transaction(function () use ($link, $worker) {
            $case = $link->case;
            $transactionId = $link->his_transaction_id;

            $link->delete();

            if ($case !== null) {
                $this->cases->logMilestone(
                    $case,
                    $worker,
                    'hospital_transaction_unlinked',
                    "Hospital encounter #{$transactionId} detached",
                );
            }
        });
    }

    /**
     * A case may only carry encounters for its own HIS-linked patient.
     */
    private function guard(CaseModel $case, PatientTransaction $transaction): void
    {
        $caseHospitalNumber = $case->patient?->hospital_id;

        if (blank($caseHospitalNumber)) {
            throw ValidationException::withMessages([
                'case' => 'This case patient is not linked to a hospital record.',
            ]);
        }

        if ((string) $transaction->patient?->patid !== (string) $caseHospitalNumber) {
            throw ValidationException::withMessages([
                'his_transaction_id' => 'This hospital encounter belongs to a different patient.',
            ]);
        }
    }

    /**
     * Curated point-in-time snapshot, built through PatientTransactionResource so
     * the Bizbox translation lives in one place. HIS diagnosis is reference only.
     *
     * @return array<string, mixed>
     */
    private function snapshot(PatientTransaction $transaction): array
    {
        // Full serialize (not resolve()) so nested resource collections — the
        // guarantors and their computed guarantor_details — become plain arrays.
        $payload = json_decode(json_encode(new PatientTransactionResource($transaction)), true) ?? [];

        $guarantors = collect($payload['patient_guarantors'] ?? [])
            ->map(fn ($guarantor) => [
                'name' => $guarantor['guarantor_details']['guarantor_name'] ?? null,
                'amount' => $guarantor['amount'] ?? null,
            ])
            ->values()
            ->all();

        return [
            'registration_status' => $payload['registration_status'] ?? null,
            'registration_date' => $payload['registration_date'] ?? null,
            'service_type' => $payload['service_type'] ?? null,
            'admission_case_type' => $payload['admission_case_type'] ?? null,
            'admission_result' => $payload['admission_result'] ?? null,
            'membership' => $payload['membership'] ?? null,
            'discount' => $payload['discount'] ?? null,
            'hospital_plan' => $payload['hospital_plan'] ?? null,
            'transaction_type' => $payload['transaction_type'] ?? null,
            'guarantors' => $guarantors,
            'guarantor_total' => collect($guarantors)->sum(fn ($g) => (float) ($g['amount'] ?? 0)),
            'discharge_number' => $payload['discharge_number'] ?? null,
            'discharge_date' => $payload['discharge_date'] ?? null,
            // HIS diagnosis — reference only; the case's Diagnostic is authoritative.
            'impression' => $payload['doctors_impression'] ?? null,
            'final_diagnosis' => $payload['final_diagnosis'] ?? null,
        ];
    }
}
