<?php

namespace App\Services;

use App\DTOs\PatientDto;
use App\Models\Patient;
use App\Models\User;
use App\Repositories\Contracts\PatientRepositoryInterface;
use App\Support\ListQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class PatientService
{
    /**
     * Case statuses that block archiving a patient.
     *
     * @var list<string>
     */
    private const ACTIVE_CASE_STATUSES = ['open', 'ongoing'];

    /**
     * Ceiling on the unpaginated history read.
     *
     * Phase 1 widened audit coverage and Phase 2 widened this endpoint's reach
     * to every record resolving to the patient, so a long-running patient can
     * now produce far more rows than the old six-type fan-out did. The endpoint
     * returns a flat array by contract and cannot paginate without breaking the
     * client, so it is capped instead; the paginated read is the Phase 4
     * `/activity-log` endpoint.
     */
    private const HISTORY_LIMIT = 200;

    public function __construct(protected PatientRepositoryInterface $repository) {}

    public function list(?ListQuery $query = null): LengthAwarePaginator
    {
        return $this->repository->paginateList($query ?? new ListQuery);
    }

    public function find(int|string $id): Patient
    {
        return $this->repository->findOrFail($id);
    }

    public function create(PatientDto $dto): Patient
    {
        $attributes = $dto->toArray();
        $attributes['mswd_id'] ??= $this->generateMswdId();

        return $this->repository->create($attributes);
    }

    public function update(Patient $patient, PatientDto $dto): Patient
    {
        return $this->repository->update($patient, $dto->toArray());
    }

    /**
     * Candidate duplicates of a patient (same name + birthdate), excluding itself.
     */
    public function duplicatesOf(Patient $patient): Collection
    {
        return $this->repository
            ->matchByIdentity($patient->last_name, $patient->first_name, $patient->birthdate?->toDateString())
            ->reject(fn (Patient $candidate) => $candidate->is($patient))
            ->values();
    }

    /**
     * The full patient record for the 360 profile view.
     */
    public function profile(Patient $patient): Patient
    {
        return $patient->load([
            'sector',
            'patientIds',
            'familyMembers',
            'watchers',
            // caretakers.user for the same reason as cases.assignedUser: the
            // Caretake tab reads custody off this profile payload, and without
            // the relation every card renders "User #3".
            'caretakers.user',
            'caretakers.assignedBy',
            'caretakers.unassignedBy',
            // assignedUser so the Staff tab has a name, not just an id.
            'cases.assignedUser',
            'documents',
        ])->loadCount(['cases', 'patientIds', 'familyMembers', 'watchers', 'documents']);
    }

    /**
     * Soft-archive a patient. Blocked while any case is open or ongoing.
     */
    public function archive(Patient $patient): bool
    {
        if ($patient->cases()->whereIn('status', self::ACTIVE_CASE_STATUSES)->exists()) {
            throw ValidationException::withMessages([
                'patient' => 'A patient with open or ongoing cases cannot be archived.',
            ]);
        }

        return $this->repository->delete($patient);
    }

    public function restore(int|string $id): Patient
    {
        $patient = Patient::withTrashed()->findOrFail($id);
        $patient->restore();

        return $patient;
    }

    /**
     * The audit trail for a patient and every record it owns, newest first.
     */
    /**
     * The patient's audit trail, newest first.
     *
     * Reads the stamped `patient_id` rather than fanning out over the subject
     * types the patient owns, so this is one indexed query whatever the reach.
     * That reach also widens for free: every audited record that resolves to
     * this patient now appears, including the episode-level ones the old
     * six-type fan-out could not name.
     *
     * Returns a Collection, not a paginator: the client contract for
     * `GET /patients/{patient}/history` is an unpaginated array, so the growth
     * in reach is capped here instead.
     */
    public function history(Patient $patient, ?User $viewer = null): Collection
    {
        return app(ActivityLogService::class)->collect(
            ['patient_id' => $patient->id],
            $viewer,
            self::HISTORY_LIMIT,
        );
    }

    /**
     * App-generated MSWD identifier, e.g. 20260001 (year + zero-padded sequence).
     */
    private function generateMswdId(): int
    {
        $year = now()->year;
        $sequence = Patient::withTrashed()->whereYear('created_at', $year)->count() + 1;

        return (int) ($year.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT));
    }
}
