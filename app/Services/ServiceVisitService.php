<?php

namespace App\Services;

use App\Models\Patient;
use App\Models\ServiceVisit;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The turnaround state machine for a patient's MSWD visit:
 * waiting → in_progress → completed, or cancelled from either open state.
 * A visit in progress belongs to whoever started it: only they finish it, unless
 * it is taken over. Every stamp is taken from the server clock.
 */
class ServiceVisitService
{
    private const WITH = ['patient', 'receivedBy', 'servedBy', 'completedBy', 'cancelledBy', 'takenOverBy', 'darEntries'];

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

    /** The caller becomes the visit's server: nobody else can finish it until it is taken over. */
    public function start(ServiceVisit $visit, User $user): ServiceVisit
    {
        return $this->transition($visit, function (ServiceVisit $visit) use ($user) {
            if ($visit->status === ServiceVisit::STATUS_IN_PROGRESS && $visit->servedBy !== null) {
                throw ValidationException::withMessages([
                    'status' => self::userName($visit->servedBy).' is already serving this patient.',
                ]);
            }

            $this->ensureStatus($visit, [ServiceVisit::STATUS_WAITING], 'Only a waiting patient can be started.');
            $this->ensureNotServingAnother($visit, $user);

            $visit->update([
                'status' => ServiceVisit::STATUS_IN_PROGRESS,
                'started_at' => now(),
                'served_by' => $user->id,
            ]);
        });
    }

    public function complete(ServiceVisit $visit, User $user, ?string $remarks = null): ServiceVisit
    {
        return $this->transition($visit, function (ServiceVisit $visit) use ($user, $remarks) {
            $this->ensureStatus($visit, [ServiceVisit::STATUS_IN_PROGRESS], 'Only a visit in progress can be completed.');
            $this->ensureNotHeldByAnother($visit, $user);

            $visit->update([
                'status' => ServiceVisit::STATUS_COMPLETED,
                'completed_at' => now(),
                'completed_by' => $user->id,
                'remarks' => $remarks ?? $visit->remarks,
            ]);
        });
    }

    public function cancel(ServiceVisit $visit, User $user, string $reason): ServiceVisit
    {
        return $this->transition($visit, function (ServiceVisit $visit) use ($user, $reason) {
            $this->ensureStatus($visit, ServiceVisit::OPEN_STATUSES, 'Only an open visit can be cancelled.');
            $this->ensureNotHeldByAnother($visit, $user);

            $visit->update([
                'status' => ServiceVisit::STATUS_CANCELLED,
                'cancelled_at' => now(),
                'cancelled_by' => $user->id,
                'cancel_reason' => $reason,
            ]);
        });
    }

    /**
     * Moves a visit in progress to the caller, for when its server is away. The
     * turnaround clock keeps running; the audit trail keeps who held it before.
     */
    public function takeOver(ServiceVisit $visit, User $user, string $reason): ServiceVisit
    {
        return $this->transition($visit, function (ServiceVisit $visit) use ($user, $reason) {
            $this->ensureStatus($visit, [ServiceVisit::STATUS_IN_PROGRESS], 'Only a visit in progress can be taken over.');

            if ((int) $visit->served_by === (int) $user->id) {
                throw ValidationException::withMessages(['status' => 'You are already serving this patient.']);
            }

            $this->ensureNotServingAnother($visit, $user);

            $visit->update([
                'served_by' => $user->id,
                'taken_over_by' => $user->id,
                'taken_over_at' => now(),
                'takeover_reason' => $reason,
            ]);
        });
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

    /**
     * Applies a state change to a locked, freshly read copy of the row, so two desks
     * acting at once are decided by the current status and not by what each one loaded.
     *
     * @param  callable(ServiceVisit): void  $change
     */
    private function transition(ServiceVisit $visit, callable $change): ServiceVisit
    {
        $current = DB::transaction(function () use ($visit, $change) {
            $current = ServiceVisit::query()->whereKey($visit->getKey())->lockForUpdate()->firstOrFail();

            $change($current);

            return $current;
        });

        return $current->load(self::WITH);
    }

    /** @param  list<string>  $allowed */
    private function ensureStatus(ServiceVisit $visit, array $allowed, string $message): void
    {
        if (! in_array($visit->status, $allowed, true)) {
            throw ValidationException::withMessages(['status' => $message]);
        }
    }

    /** A visit in progress belongs to its server. One with no recorded server is left open, so it can't get stuck. */
    private function ensureNotHeldByAnother(ServiceVisit $visit, User $user): void
    {
        if ($visit->status !== ServiceVisit::STATUS_IN_PROGRESS || $visit->served_by === null || (int) $visit->served_by === (int) $user->id) {
            return;
        }

        abort(Response::HTTP_FORBIDDEN, 'Being served by '.self::userName($visit->servedBy).'.');
    }

    /**
     * A worker serves one patient at a time, so a visit can't be left in progress
     * while they move on to the next one. Run inside transition()'s transaction.
     */
    private function ensureNotServingAnother(ServiceVisit $visit, User $user): void
    {
        $other = ServiceVisit::query()
            ->where('status', ServiceVisit::STATUS_IN_PROGRESS)
            ->where('served_by', $user->id)
            ->whereKeyNot($visit->getKey())
            ->lockForUpdate()
            ->with('patient')
            ->first();

        if ($other === null) {
            return;
        }

        $name = $other->patient === null
            ? 'your current patient'
            : trim("{$other->patient->first_name} {$other->patient->last_name}");

        throw ValidationException::withMessages([
            'status' => "Complete or cancel {$name} before serving another patient.",
        ]);
    }

    private static function userName(?User $user): string
    {
        return $user?->employee_name ?? $user?->email ?? 'another worker';
    }
}
