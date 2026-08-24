<?php

namespace App\Services;

use App\DTOs\PatientAssistanceDto;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\PatientAssistance;
use App\Models\PatientAssistanceLog;
use App\Models\PatientAssistanceReport;
use App\Models\User;
use App\Repositories\Contracts\PatientAssistanceRepositoryInterface;
use App\Support\ListQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Activitylog\Models\Activity;

class PatientAssistanceService
{
    public function __construct(protected PatientAssistanceRepositoryInterface $repository) {}

    public function list(?ListQuery $query = null): LengthAwarePaginator
    {
        return $this->repository->paginateList($query ?? new ListQuery);
    }

    public function find(int|string $id): PatientAssistance
    {
        return $this->repository->findOrFail($id);
    }

    /**
     * Record a new aid request for a case, pending approval, and log the entry.
     */
    public function create(PatientAssistanceDto $dto, User $creator): PatientAssistance
    {
        return DB::transaction(function () use ($dto, $creator) {
            $attributes = $dto->toArray();
            $attributes['created_by'] ??= $creator->id;
            $attributes['status'] ??= PatientAssistance::STATUS_PENDING;
            $attributes['date_given'] ??= now();

            /** @var PatientAssistance $assistance */
            $assistance = $this->repository->create($attributes);

            $this->log($assistance, $creator, 'created');

            return $assistance;
        });
    }

    /**
     * Amend an aid request. Only permitted while it is still pending.
     */
    public function update(PatientAssistance $assistance, PatientAssistanceDto $dto): PatientAssistance
    {
        if (! $assistance->isEditable()) {
            throw ValidationException::withMessages([
                'status' => 'Only a pending assistance can be edited.',
            ]);
        }

        return $this->repository->update($assistance, $dto->toArray());
    }

    /**
     * Approve a pending aid, clearing it for release.
     */
    public function approve(PatientAssistance $assistance, User $actor): PatientAssistance
    {
        if (! $assistance->isPending()) {
            throw ValidationException::withMessages([
                'status' => 'Only a pending assistance can be approved.',
            ]);
        }

        return DB::transaction(function () use ($assistance, $actor) {
            /** @var PatientAssistance $assistance */
            $assistance = $this->repository->update($assistance, [
                'status' => PatientAssistance::STATUS_APPROVED,
            ]);

            $this->log($assistance, $actor, 'approved');

            return $assistance;
        });
    }

    /**
     * Release an approved aid: snapshot the patient and aid into an immutable
     * report, mark it released, and log the transition.
     */
    public function release(PatientAssistance $assistance, User $actor): PatientAssistance
    {
        if (! $assistance->isApproved()) {
            throw ValidationException::withMessages([
                'status' => 'Only an approved assistance can be released.',
            ]);
        }

        return DB::transaction(function () use ($assistance, $actor) {
            /** @var PatientAssistance $assistance */
            $assistance = $this->repository->update($assistance, [
                'status' => PatientAssistance::STATUS_RELEASED,
            ]);

            $this->generateReport($assistance, $actor);
            $this->log($assistance, $actor, 'released');

            return $assistance;
        });
    }

    /**
     * Cancel a pending or approved aid. A released aid cannot be cancelled.
     */
    public function cancel(PatientAssistance $assistance, User $actor, ?string $notes = null): PatientAssistance
    {
        if (! $assistance->isCancellable()) {
            throw ValidationException::withMessages([
                'status' => 'Only a pending or approved assistance can be cancelled.',
            ]);
        }

        return DB::transaction(function () use ($assistance, $actor, $notes) {
            /** @var PatientAssistance $assistance */
            $assistance = $this->repository->update($assistance, [
                'status' => PatientAssistance::STATUS_CANCELLED,
            ]);

            $this->log($assistance, $actor, $notes ?? 'cancelled');

            return $assistance;
        });
    }

    /**
     * Soft-delete an aid. A released aid is retained as it has a report.
     */
    public function delete(PatientAssistance $assistance): bool
    {
        if ($assistance->isReleased()) {
            throw ValidationException::withMessages([
                'status' => 'A released assistance cannot be deleted.',
            ]);
        }

        return $this->repository->delete($assistance);
    }

    /**
     * The full trail for an aid: field-level diffs plus status transitions.
     */
    public function history(PatientAssistance $assistance): Collection
    {
        return Activity::query()
            ->where('subject_type', $assistance->getMorphClass())
            ->where('subject_id', $assistance->id)
            ->with('causer')
            ->latest()
            ->get();
    }

    /**
     * Build the released-aid report from the patient (reached via the case)
     * and the aid's own details.
     */
    private function generateReport(PatientAssistance $assistance, User $actor): PatientAssistanceReport
    {
        $assistance->loadMissing(['case.patient', 'assistantType', 'guarantor']);

        /** @var CaseModel $case */
        $case = $assistance->case;
        /** @var Patient $patient */
        $patient = $case->patient;

        return PatientAssistanceReport::create([
            'assistance_id' => $assistance->id,
            'hospital_id' => $patient->hospital_id,
            'mswd_id' => $patient->mswd_id,
            'patient_name' => $this->patientName($patient),
            'patient_address' => $patient->address,
            'assistant_type' => $assistance->assistantType?->name ?? '',
            'category' => $assistance->assistantType?->category ?? '',
            'amount' => $assistance->amount,
            'snapshot_json' => $this->snapshot($assistance, $case, $patient),
            'released_by' => $actor->id,
            'released_at' => now(),
            'is_void' => false,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function snapshot(PatientAssistance $assistance, CaseModel $case, Patient $patient): array
    {
        return [
            'assistance' => [
                'id' => $assistance->id,
                'amount' => $assistance->amount,
                'notes' => $assistance->notes,
                'date_given' => optional($assistance->date_given)->toDateTimeString(),
                'assistant_type' => $assistance->assistantType?->name,
                'category' => $assistance->assistantType?->category,
                'guarantor' => $assistance->guarantor?->name,
            ],
            'case' => [
                'id' => $case->id,
                'case_code' => $case->case_code,
            ],
            'patient' => [
                'id' => $patient->id,
                'hospital_id' => $patient->hospital_id,
                'mswd_id' => $patient->mswd_id,
                'name' => $this->patientName($patient),
                'address' => $patient->address,
            ],
        ];
    }

    private function patientName(Patient $patient): string
    {
        return trim(implode(' ', array_filter([
            $patient->first_name,
            $patient->middle_name,
            $patient->last_name,
            $patient->extension_name,
        ])));
    }

    private function log(PatientAssistance $assistance, User $actor, string $action): PatientAssistanceLog
    {
        return $assistance->logs()->create([
            'status' => $assistance->status,
            'action' => $action,
            'action_by' => $actor->id,
            'action_date' => now(),
        ]);
    }
}
