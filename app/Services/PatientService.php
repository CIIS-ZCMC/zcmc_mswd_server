<?php

namespace App\Services;

use App\DTOs\PatientDto;
use App\Models\Document;
use App\Models\Patient;
use App\Models\PatientCaretaker;
use App\Models\PatientFamilyMember;
use App\Models\PatientId;
use App\Models\PatientWatcher;
use App\Repositories\Contracts\PatientRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;
use Spatie\Activitylog\Models\Activity;

class PatientService
{
    /**
     * Case statuses that block archiving a patient.
     *
     * @var list<string>
     */
    private const ACTIVE_CASE_STATUSES = ['open', 'ongoing'];

    public function __construct(protected PatientRepositoryInterface $repository) {}

    public function list(int $page = 1, int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($page, $perPage);
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
            'caretakers',
            'cases',
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
    public function history(Patient $patient): Collection
    {
        $subjects = [
            Patient::class => [$patient->id],
            PatientId::class => $patient->patientIds()->pluck('id')->all(),
            PatientFamilyMember::class => $patient->familyMembers()->pluck('id')->all(),
            PatientWatcher::class => $patient->watchers()->pluck('id')->all(),
            PatientCaretaker::class => $patient->caretakers()->pluck('id')->all(),
            Document::class => $patient->documents()->pluck('id')->all(),
        ];

        return Activity::query()
            ->where(function ($query) use ($subjects) {
                foreach ($subjects as $type => $ids) {
                    if ($ids === []) {
                        continue;
                    }

                    $query->orWhere(fn ($sub) => $sub
                        ->where('subject_type', (new $type)->getMorphClass())
                        ->whereIn('subject_id', $ids));
                }
            })
            ->with('causer')
            ->latest()
            ->get();
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
