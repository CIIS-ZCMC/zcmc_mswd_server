<?php

namespace App\Services;

use App\Models\Assessment;
use App\Models\CaseModel;
use App\Models\UisPrintLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * The UIS print history. A print belongs to the encounter's UIS (patient_id +
 * transaction_id), so prints made before a case was opened on the encounter
 * stay in its history; `case_id` is set when a case exists.
 */
class UisPrintLogService
{
    /**
     * Record one UIS print for a case. `transaction_id` is denormalized from the
     * case so the history is queryable per hospital encounter.
     */
    public function record(CaseModel $case, User $user, int $copies = 1, ?string $remarks = null): UisPrintLog
    {
        return $this->log($case->patient_id, $case->transaction_id, $case->id, $user, $copies, $remarks);
    }

    /** Record one UIS print of an intake assessment, with or without a case. */
    public function recordForAssessment(Assessment $assessment, User $user, int $copies = 1, ?string $remarks = null): UisPrintLog
    {
        return $this->log($assessment->patient_id, $assessment->his_transaction_id, $assessment->case_id, $user, $copies, $remarks);
    }

    /**
     * The print history for a case, newest first.
     *
     * @return Collection<int, UisPrintLog>
     */
    public function history(CaseModel $case): Collection
    {
        return $this->newest($this->forEncounter($case->patient_id, $case->transaction_id, $case->id));
    }

    /**
     * The print history of an intake's encounter, newest first.
     *
     * @return Collection<int, UisPrintLog>
     */
    public function historyForAssessment(Assessment $assessment): Collection
    {
        return $this->newest($this->forEncounter($assessment->patient_id, $assessment->his_transaction_id, $assessment->case_id));
    }

    /** @return Builder<UisPrintLog> */
    public function forEncounter(?int $patientId, int|string|null $transactionId, ?int $caseId): Builder
    {
        // The encounter's prints, and the case's own (a case with no encounter, or
        // a print logged before the encounter was recorded on it).
        return UisPrintLog::query()->where(fn (Builder $query) => $query
            ->when($transactionId !== null, fn (Builder $q) => $q->where(fn (Builder $q) => $q
                ->where('patient_id', $patientId)->where('transaction_id', $transactionId)))
            ->when($caseId !== null, fn (Builder $q) => $q->orWhere('case_id', $caseId))
            ->when($transactionId === null && $caseId === null, fn (Builder $q) => $q->whereRaw('1 = 0')));
    }

    /**
     * @param  Builder<UisPrintLog>  $query
     * @return Collection<int, UisPrintLog>
     */
    private function newest(Builder $query): Collection
    {
        return $query->with('printedBy')->latest('printed_at')->get();
    }

    private function log(int $patientId, int|string|null $transactionId, ?int $caseId, User $user, int $copies, ?string $remarks): UisPrintLog
    {
        return UisPrintLog::create([
            'case_id' => $caseId,
            'patient_id' => $patientId,
            'transaction_id' => $transactionId,
            'printed_by' => $user->id,
            'printed_at' => now(),
            'copies' => max(1, $copies),
            'remarks' => $remarks,
        ]);
    }
}
