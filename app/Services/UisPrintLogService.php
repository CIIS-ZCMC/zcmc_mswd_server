<?php

namespace App\Services;

use App\Models\CaseModel;
use App\Models\UisPrintLog;
use App\Models\User;
use Illuminate\Support\Collection;

class UisPrintLogService
{
    /**
     * Record one UIS print for a case. `transaction_id` is denormalized from the
     * case so the history is queryable per hospital encounter.
     */
    public function record(CaseModel $case, User $user, int $copies = 1, ?string $remarks = null): UisPrintLog
    {
        return UisPrintLog::create([
            'case_id' => $case->id,
            'patient_id' => $case->patient_id,
            'transaction_id' => $case->transaction_id,
            'printed_by' => $user->id,
            'printed_at' => now(),
            'copies' => max(1, $copies),
            'remarks' => $remarks,
        ]);
    }

    /**
     * The print history for a case, newest first.
     *
     * @return Collection<int, UisPrintLog>
     */
    public function history(CaseModel $case): Collection
    {
        return $case->uisPrintLogs()
            ->with('printedBy')
            ->latest('printed_at')
            ->get();
    }
}
