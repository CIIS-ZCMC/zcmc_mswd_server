<?php

namespace App\Services;

use App\Models\Patient;
use App\Models\ServiceVisit;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The turnaround state machine for a patient's MSWD visit:
 * waiting → in_progress → completed, or cancelled from either open state.
 * Every stamp is taken from the server clock. See docs/TURNAROUND_TIME_PLAN.md.
 */
class ServiceVisitService
{
    private const WITH = ['patient', 'receivedBy', 'servedBy', 'completedBy', 'cancelledBy'];

    /** Time a patient in for one HIS encounter. One open visit per encounter. */
    public function timeIn(Patient $patient, int $transactionId, User $user, array $details = []): ServiceVisit
    {
        $visit = DB::transaction(function () use ($patient, $transactionId, $user, $details) {
            // Locks the encounter's open rows so two desks can't time the same patient in twice.
            $alreadyOpen = ServiceVisit::query()
                ->forEncounter($patient->id, $transactionId)
                ->open()
                ->lockForUpdate()
                ->exists();

            if ($alreadyOpen) {
                throw ValidationException::withMessages([
                    'his_transaction_id' => 'This encounter is already on the queue.',
                ]);
            }

            return ServiceVisit::create([
                'patient_id' => $patient->id,
                'his_transaction_id' => $transactionId,
                'status' => ServiceVisit::STATUS_WAITING,
                'purpose' => $details['purpose'] ?? null,
                'remarks' => $details['remarks'] ?? null,
                'arrived_at' => now(),
                'received_by' => $user->id,
            ]);
        });

        return $visit->load(self::WITH);
    }

    public function start(ServiceVisit $visit, User $user): ServiceVisit
    {
        $this->ensureStatus($visit, [ServiceVisit::STATUS_WAITING], 'Only a waiting patient can be started.');

        $visit->update([
            'status' => ServiceVisit::STATUS_IN_PROGRESS,
            'started_at' => now(),
            'served_by' => $user->id,
        ]);

        return $visit->load(self::WITH);
    }

    public function complete(ServiceVisit $visit, User $user, ?string $remarks = null): ServiceVisit
    {
        $this->ensureStatus($visit, [ServiceVisit::STATUS_IN_PROGRESS], 'Only a visit in progress can be completed.');

        $visit->update([
            'status' => ServiceVisit::STATUS_COMPLETED,
            'completed_at' => now(),
            'completed_by' => $user->id,
            'remarks' => $remarks ?? $visit->remarks,
        ]);

        return $visit->load(self::WITH);
    }

    public function cancel(ServiceVisit $visit, User $user, string $reason): ServiceVisit
    {
        $this->ensureStatus($visit, ServiceVisit::OPEN_STATUSES, 'Only an open visit can be cancelled.');

        $visit->update([
            'status' => ServiceVisit::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'cancelled_by' => $user->id,
            'cancel_reason' => $reason,
        ]);

        return $visit->load(self::WITH);
    }

    /**
     * The queue board for a day: every open visit (whatever day it arrived, so
     * nobody falls off overnight), and the visits completed that day.
     *
     * @return array{waiting: Collection<int, ServiceVisit>, in_progress: Collection<int, ServiceVisit>, completed: Collection<int, ServiceVisit>}
     */
    public function queue(Carbon $date): array
    {
        $open = ServiceVisit::query()->open()->with(self::WITH)->orderBy('arrived_at')->orderBy('id')->get();

        return [
            'waiting' => $open->where('status', ServiceVisit::STATUS_WAITING)->values(),
            'in_progress' => $open->where('status', ServiceVisit::STATUS_IN_PROGRESS)->values(),
            'completed' => ServiceVisit::query()
                ->where('status', ServiceVisit::STATUS_COMPLETED)
                ->whereBetween('completed_at', [$date->copy()->startOfDay(), $date->copy()->endOfDay()])
                ->with(self::WITH)
                ->orderByDesc('completed_at')
                ->get(),
        ];
    }

    /** @return Collection<int, ServiceVisit> */
    public function forPatient(Patient $patient, ?int $transactionId = null): Collection
    {
        return ServiceVisit::query()
            ->where('patient_id', $patient->id)
            ->when($transactionId !== null, fn ($query) => $query->where('his_transaction_id', $transactionId))
            ->with(self::WITH)
            ->orderByDesc('arrived_at')
            ->orderByDesc('id')
            ->get();
    }

    /** @param  list<string>  $allowed */
    private function ensureStatus(ServiceVisit $visit, array $allowed, string $message): void
    {
        if (! in_array($visit->status, $allowed, true)) {
            throw ValidationException::withMessages(['status' => $message]);
        }
    }
}
