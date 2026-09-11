<?php

namespace App\Services;

use App\DTOs\PatientCaretakerDto;
use App\Models\PatientCaretaker;
use App\Models\User;
use App\Repositories\Contracts\PatientCaretakerRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PatientCaretakerService
{
    public function __construct(protected PatientCaretakerRepositoryInterface $repository) {}

    public function list(int $page = 1, int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($page, $perPage);
    }

    public function find(int|string $id): PatientCaretaker
    {
        return $this->repository->findOrFail($id);
    }

    /**
     * Assign a caretaker, recording who made the assignment.
     */
    public function create(PatientCaretakerDto $dto, ?User $actor = null): PatientCaretaker
    {
        $attributes = $dto->toArray();
        $attributes['assigned_by'] ??= $actor?->id;

        return $this->guardUniqueness(fn () => $this->repository->create($attributes));
    }

    public function update(PatientCaretaker $patientCaretaker, PatientCaretakerDto $dto): PatientCaretaker
    {
        return $this->guardUniqueness(
            fn () => $this->repository->update($patientCaretaker, $dto->toArray()),
        );
    }

    /**
     * End an assignment, recording who ended it and why.
     *
     * Lives here rather than in the controller so Filament actions and console
     * commands end an assignment the same way the API does.
     */
    public function unassign(
        PatientCaretaker $caretaker,
        ?User $actor = null,
        ?string $reason = null,
    ): PatientCaretaker {
        return $this->repository->update($caretaker, [
            'is_active' => false,
            'unassigned_date' => now(),
            'unassigned_by' => $actor?->id,
            'unassigned_reason' => $reason,
        ]);
    }

    /**
     * Hand a patient's caretaker role over to someone else.
     *
     * One transaction, because a handover that ends the old assignment without
     * creating the new one leaves the patient with nobody responsible — the
     * exact state the unique guard makes it impossible to repair by simply
     * re-running the call.
     */
    public function reassign(
        PatientCaretaker $current,
        int $userId,
        ?User $actor = null,
        ?string $reason = null,
    ): PatientCaretaker {
        return DB::transaction(function () use ($current, $userId, $actor, $reason) {
            // The old row is retired first: it releases the guard value that the
            // replacement is about to claim.
            $this->repository->update($current, [
                'is_active' => false,
                'unassigned_date' => now(),
                'unassigned_by' => $actor?->id,
                'unassigned_reason' => $reason,
            ]);

            $replacement = $this->guardUniqueness(fn () => $this->repository->create([
                'patient_id' => $current->patient_id,
                'user_id' => $userId,
                'role' => $current->role,
                'assigned_date' => now(),
                'assigned_by' => $actor?->id,
                'reason' => $reason,
                'is_active' => true,
            ]));

            $this->repository->update($current, ['replaced_by_id' => $replacement->id]);

            return $replacement;
        });
    }

    public function delete(PatientCaretaker $patientCaretaker): bool
    {
        return $this->repository->delete($patientCaretaker);
    }

    /**
     * Turn a uniq_active_patient_caretaker violation into a 422 the client can
     * act on, instead of letting it surface as a 500.
     *
     * @template T
     *
     * @param  callable(): T  $operation
     * @return T
     */
    private function guardUniqueness(callable $operation)
    {
        try {
            return $operation();
        } catch (QueryException $exception) {
            if (! $this->isActiveCaretakerCollision($exception)) {
                throw $exception;
            }

            throw ValidationException::withMessages([
                'user_id' => 'This patient already has an active caretaker in that role. Reassign the existing one instead.',
            ]);
        }
    }

    private function isActiveCaretakerCollision(QueryException $exception): bool
    {
        return str_contains($exception->getMessage(), 'uniq_active_patient_caretaker')
            || str_contains($exception->getMessage(), 'active_caretaker_guard');
    }
}
