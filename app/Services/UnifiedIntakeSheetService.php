<?php

namespace App\Services;

use App\DTOs\UnifiedIntakeSheetDto;
use App\Models\Assessment;
use App\Models\CaseActivity;
use App\Models\CaseModel;
use App\Models\Document;
use App\Models\Patient;
use App\Models\UnifiedIntakeSheet;
use App\Models\User;
use App\Repositories\Contracts\AssessmentRepositoryInterface;
use App\Repositories\Contracts\CaseModelRepositoryInterface;
use App\Repositories\Contracts\PatientRepositoryInterface;
use App\Repositories\Contracts\UnifiedIntakeSheetRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Spatie\Activitylog\Models\Activity;

class UnifiedIntakeSheetService
{
    public function __construct(
        protected UnifiedIntakeSheetRepositoryInterface $sheets,
        protected PatientRepositoryInterface $patients,
        protected CaseModelRepositoryInterface $cases,
        protected AssessmentRepositoryInterface $assessments,
        protected UnifiedIntakeSheetPdfService $pdf,
    ) {}

    public function list(int $page = 1, int $perPage = 15): LengthAwarePaginator
    {
        return $this->sheets->paginate($page, $perPage);
    }

    public function find(int|string $id): UnifiedIntakeSheet
    {
        return $this->sheets->findOrFail($id);
    }

    /**
     * The audit trail for an intake: field-level changes and milestones for the
     * sheet and every record it links (patient, case, assessment), newest first.
     */
    public function history(UnifiedIntakeSheet $sheet): Collection
    {
        $subjects = array_filter([
            [UnifiedIntakeSheet::class, $sheet->id],
            [CaseModel::class, $sheet->case_id],
            [Assessment::class, $sheet->assessment_id],
            [Patient::class, $sheet->patient_id],
        ], fn ($pair) => $pair[1] !== null);

        return Activity::query()
            ->where(function ($query) use ($subjects) {
                foreach ($subjects as [$type, $id]) {
                    $query->orWhere(fn ($q) => $q->where('subject_type', (new $type)->getMorphClass())->where('subject_id', $id));
                }
            })
            ->with('causer')
            ->latest()
            ->get();
    }

    /**
     * Candidate duplicate patients for the dedupe step.
     */
    public function matchPatients(string $lastName, string $firstName, ?string $birthdate = null): Collection
    {
        return $this->patients->matchByIdentity($lastName, $firstName, $birthdate);
    }

    /**
     * Assemble a full intake in one transaction: resolve the patient (reuse or
     * create), open a new case or attach to an existing open one, record the
     * assessment and any recommended assistance, then link them under a draft
     * intake sheet.
     */
    public function createDraft(UnifiedIntakeSheetDto $dto, User $worker): UnifiedIntakeSheet
    {
        return DB::transaction(function () use ($dto, $worker) {
            $patient = $this->resolvePatient($dto);
            [$case, $isNewCase] = $this->resolveCase($dto, $patient, $worker);
            $assessment = $this->createAssessment($dto, $case, $worker);
            $this->createAssistances($dto, $case, $worker);

            /** @var UnifiedIntakeSheet $sheet */
            $sheet = $this->sheets->create(array_merge($dto->headerAttributes(), [
                'intake_no' => $this->nextIntakeNumber(),
                'patient_id' => $patient->id,
                'case_id' => $case->id,
                'assessment_id' => $assessment?->id,
                'intake_worker_id' => $worker->id,
                'date_of_intake' => $dto->date_of_intake ?? now(),
                'status' => UnifiedIntakeSheet::STATUS_DRAFT,
            ]));

            $this->recordCaseActivity(
                $case,
                $worker,
                $isNewCase ? 'case_opened' : 'intake_appended',
                "Intake {$sheet->intake_no}",
            );

            return $sheet->fresh(['patient', 'case', 'assessment', 'intakeWorker']);
        });
    }

    public function update(UnifiedIntakeSheet $sheet, UnifiedIntakeSheetDto $dto): UnifiedIntakeSheet
    {
        $this->assertEditable($sheet);

        return DB::transaction(function () use ($sheet, $dto) {
            $this->sheets->update($sheet, $dto->headerAttributes());

            if ($dto->assessment !== null && $sheet->assessment_id !== null) {
                $this->assessments->update($sheet->assessment, $dto->assessment->toArray());
            }

            return $sheet->fresh(['patient', 'case', 'assessment', 'intakeWorker']);
        });
    }

    public function submit(UnifiedIntakeSheet $sheet): UnifiedIntakeSheet
    {
        $this->assertEditable($sheet);

        $this->sheets->update($sheet, [
            'status' => UnifiedIntakeSheet::STATUS_SUBMITTED,
            'submitted_at' => now(),
        ]);

        return $sheet->refresh();
    }

    public function finalize(UnifiedIntakeSheet $sheet, User $user): UnifiedIntakeSheet
    {
        $this->assertEditable($sheet);

        if ($sheet->case_id === null || $sheet->assessment_id === null) {
            throw ValidationException::withMessages([
                'status' => 'An intake needs a case and an assessment before it can be finalized.',
            ]);
        }

        return DB::transaction(function () use ($sheet, $user) {
            $this->sheets->update($sheet, [
                'status' => UnifiedIntakeSheet::STATUS_FINALIZED,
                'submitted_at' => $sheet->submitted_at ?? now(),
                'finalized_at' => now(),
                'finalized_by' => $user->id,
            ]);

            // Archive the official PDF once, reflecting the finalized state.
            $this->archiveFinalizedPdf($sheet->refresh(), $user);

            $this->recordCaseActivity($sheet->case, $user, 'assessment_completed', "Intake {$sheet->intake_no} finalized");

            return $sheet->refresh();
        });
    }

    /**
     * Render the finalized sheet and store it as a Document linked to the case
     * and patient, so the signed copy is retained.
     */
    private function archiveFinalizedPdf(UnifiedIntakeSheet $sheet, User $user): Document
    {
        $path = "intake-sheets/{$sheet->intake_no}.pdf";

        Storage::put($path, $this->pdf->render($sheet)->output());

        return Document::create([
            'case_id' => $sheet->case_id,
            'patient_id' => $sheet->patient_id,
            'uploaded_by' => $user->id,
            'document_type' => 'intake_sheet',
            'file_name' => $this->pdf->filename($sheet),
            'file_path' => $path,
            'file_type' => 'application/pdf',
        ]);
    }

    public function cancel(UnifiedIntakeSheet $sheet): bool
    {
        if ($sheet->isFinalized()) {
            throw ValidationException::withMessages([
                'status' => 'A finalized intake cannot be cancelled.',
            ]);
        }

        $this->sheets->update($sheet, ['status' => UnifiedIntakeSheet::STATUS_CANCELLED]);

        return $this->sheets->delete($sheet);
    }

    private function resolvePatient(UnifiedIntakeSheetDto $dto): Patient
    {
        if ($dto->patient_id !== null) {
            /** @var Patient $patient */
            $patient = $this->patients->findOrFail($dto->patient_id);
        } else {
            /** @var Patient $patient */
            $patient = $this->patients->create($dto->patient->toArray());
        }

        // Applied whether the patient is new or reused: an intake refreshes the
        // patient's identification and family / socioeconomic profile.
        $this->syncCollection($patient, 'patientIds', $dto->patientIds);
        $this->syncCollection($patient, 'familyMembers', $dto->familyMembers);
        $this->syncCollection($patient, 'watchers', $dto->watchers);

        return $patient;
    }

    /**
     * Reconcile a patient sub-collection with the submitted rows: update rows
     * that carry an `id`, create the rest, and drop existing rows omitted from
     * the payload. An empty payload leaves the collection untouched.
     *
     * @param  array<int, array<string, mixed>>  $rows
     */
    private function syncCollection(Patient $patient, string $relation, array $rows): void
    {
        if ($rows === []) {
            return;
        }

        $keptIds = [];

        foreach ($rows as $row) {
            $attributes = Arr::except($row, ['id']);
            $existing = isset($row['id'])
                ? $patient->{$relation}()->whereKey($row['id'])->first()
                : null;

            if ($existing !== null) {
                $existing->update($attributes);
                $keptIds[] = $existing->getKey();
            } else {
                $keptIds[] = $patient->{$relation}()->create($attributes)->getKey();
            }
        }

        $patient->{$relation}()->whereKeyNot($keptIds)->get()->each->delete();
    }

    /**
     * @return array{0: CaseModel, 1: bool} the case and whether it was newly opened
     */
    private function resolveCase(UnifiedIntakeSheetDto $dto, Patient $patient, User $worker): array
    {
        if ($dto->case_id !== null) {
            /** @var CaseModel $case */
            $case = $this->cases->findOrFail($dto->case_id);

            if ($case->patient_id !== $patient->id) {
                throw ValidationException::withMessages([
                    'case_id' => 'The selected case does not belong to this patient.',
                ]);
            }

            if (! in_array($case->status, UnifiedIntakeSheet::ATTACHABLE_CASE_STATUSES, true)) {
                throw ValidationException::withMessages([
                    'case_id' => 'Only open or ongoing cases can receive a new intake.',
                ]);
            }

            return [$case, false];
        }

        $attributes = array_merge($dto->case?->toArray() ?? [], [
            'patient_id' => $patient->id,
            'case_code' => $this->nextCaseCode(),
        ]);
        $attributes['assigned_user_id'] ??= $worker->id;
        $attributes['status'] ??= 'open';
        $attributes['date_opened'] ??= now();

        /** @var CaseModel $case */
        $case = $this->cases->create($attributes);

        return [$case, true];
    }

    private function createAssessment(UnifiedIntakeSheetDto $dto, CaseModel $case, User $worker): mixed
    {
        if ($dto->assessment === null) {
            return null;
        }

        return $this->assessments->create(array_merge($dto->assessment->toArray(), [
            'case_id' => $case->id,
            'created_by' => $worker->id,
        ]));
    }

    private function createAssistances(UnifiedIntakeSheetDto $dto, CaseModel $case, User $worker): void
    {
        foreach ($dto->assistances as $row) {
            $case->patientAssistances()->create(array_merge($row, [
                'created_by' => $worker->id,
                'status' => $row['status'] ?? 'pending',
                'date_given' => $row['date_given'] ?? now(),
            ]));
        }
    }

    private function recordCaseActivity(CaseModel $case, User $user, string $type, ?string $notes = null): void
    {
        CaseActivity::create([
            'case_id' => $case->id,
            'assigned_user_id' => $user->id,
            'activity_type' => $type,
            'activity_date' => now(),
            'notes' => $notes,
        ]);
    }

    private function assertEditable(UnifiedIntakeSheet $sheet): void
    {
        if (! $sheet->isEditable()) {
            throw ValidationException::withMessages([
                'status' => 'This intake can no longer be edited.',
            ]);
        }
    }

    private function nextIntakeNumber(): string
    {
        $year = now()->year;
        $sequence = UnifiedIntakeSheet::withTrashed()
            ->whereYear('created_at', $year)
            ->count() + 1;

        return sprintf('UIS-%d-%06d', $year, $sequence);
    }

    private function nextCaseCode(): string
    {
        $year = now()->year;
        $sequence = CaseModel::withTrashed()
            ->whereYear('created_at', $year)
            ->count() + 1;

        return sprintf('CASE-%d-%06d', $year, $sequence);
    }
}
