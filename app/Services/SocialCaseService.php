<?php

namespace App\Services;

use App\Actions\EnsureWatcherRequirementSatisfied;
use App\DTOs\SocialCaseDto;
use App\Models\Assessment;
use App\Models\CaseActivity;
use App\Models\CaseModel;
use App\Models\Document;
use App\Models\UnifiedIntakeSheet;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * The Social Case Study Report's lifecycle: draft → for_review → finalized,
 * with amend reopening a signed document. See docs/SOCIAL_CASE_PLAN.md §A.7.
 *
 * Starting an SCSR *promotes* the case's existing assessment rather than
 * creating a parallel record, so income, housing, classification, the
 * presenting problem and every expense line carry over with no copying —
 * they are literally the same row.
 */
class SocialCaseService
{
    public function __construct(
        protected SocialCaseNumberService $numbers,
        protected SocialCaseStudyPdfService $pdf,
        protected EnsureWatcherRequirementSatisfied $ensureWatcherRequirement,
    ) {}

    public function find(CaseModel $case): Assessment
    {
        return $case->socialCase()->firstOrFail();
    }

    /**
     * Promote one of the case's assessments into its SCSR — the latest by
     * default, or an explicit one validated to belong to this case.
     */
    public function start(CaseModel $case, User $author, SocialCaseDto $dto, ?int $assessmentId = null): Assessment
    {
        if ($case->trashed()) {
            throw ValidationException::withMessages([
                'case_id' => 'An archived case cannot open a social case study.',
            ]);
        }

        // Checked here so a second start answers 422 with a clear message
        // rather than letting uniq_case_social_case answer 500.
        if ($case->socialCase()->exists()) {
            throw ValidationException::withMessages([
                'social_case_status' => 'This case already has a social case study.',
            ]);
        }

        return DB::transaction(function () use ($case, $author, $dto, $assessmentId) {
            $assessment = $this->resolveAssessment($case, $author, $dto, $assessmentId);

            $attributes = array_merge(
                $this->seedReferralFields($case, $dto),
                $dto->toArray(),
                [
                    'social_case_status' => Assessment::SOCIAL_CASE_DRAFT,
                    'revision' => 1,
                    'prepared_by' => $author->id,
                ],
            );

            $this->numbers->assign(function (string $number) use ($assessment, $attributes) {
                $assessment->forceFill(array_merge($attributes, ['social_case_no' => $number]))->save();
            });

            $this->recordActivity($case, $author, 'social_case_started', "Social case study {$assessment->social_case_no} started");

            return $assessment->refresh();
        });
    }

    public function update(Assessment $scsr, SocialCaseDto $dto): Assessment
    {
        $this->assertEditable($scsr);

        $scsr->fill($dto->toArray())->save();

        return $scsr->refresh();
    }

    public function submitForReview(Assessment $scsr, User $user): Assessment
    {
        if ($scsr->social_case_status !== Assessment::SOCIAL_CASE_DRAFT) {
            throw ValidationException::withMessages([
                'social_case_status' => 'Only a draft social case study can be submitted for review.',
            ]);
        }

        $scsr->forceFill([
            'social_case_status' => Assessment::SOCIAL_CASE_FOR_REVIEW,
            'review_requested_at' => now(),
            'prepared_by' => $scsr->prepared_by ?? $user->id,
            'prepared_at' => $scsr->prepared_at ?? now(),
        ])->save();

        $this->recordActivity($scsr->case, $user, 'social_case_submitted', "Social case study {$scsr->social_case_no} submitted for review");

        return $scsr->refresh();
    }

    /**
     * Noting the report *is* finalizing it — there is no third signature pair.
     *
     * Permitted direct from draft: requiring the review step in the schema
     * would deadlock a one-person office and block MSS Head, who is a
     * legitimate signer. The review step is optional by policy, mandatory by
     * nothing.
     */
    public function finalize(Assessment $scsr, User $user): Assessment
    {
        $this->assertEditable($scsr);

        ($this->ensureWatcherRequirement)($scsr->case, 'have its social case study finalized');

        return DB::transaction(function () use ($scsr, $user) {
            $scsr->forceFill([
                'social_case_status' => Assessment::SOCIAL_CASE_FINALIZED,
                // Backfilled when finalizing straight from draft, where the
                // submit step that normally stamps these never ran.
                'prepared_by' => $scsr->prepared_by ?? $user->id,
                'prepared_at' => $scsr->prepared_at ?? now(),
                'noted_by' => $user->id,
                'noted_at' => now(),
            ])->save();

            $this->archiveFinalizedPdf($scsr->refresh(), $user);

            $this->recordActivity($scsr->case, $user, 'social_case_finalized', "Social case study {$scsr->social_case_no} finalized");

            return $scsr->refresh();
        });
    }

    /**
     * Reopen a signed document for correction. The prior Document row is left
     * untouched — revisions are a stack of immutable PDFs sharing a control
     * number, not rows in a revisions table (§A.8).
     */
    public function amend(Assessment $scsr, User $user, string $reason): Assessment
    {
        if ($scsr->social_case_status !== Assessment::SOCIAL_CASE_FINALIZED) {
            throw ValidationException::withMessages([
                'social_case_status' => 'Only a finalized social case study can be amended.',
            ]);
        }

        $scsr->forceFill([
            'social_case_status' => Assessment::SOCIAL_CASE_DRAFT,
            'revision' => $scsr->revision + 1,
            'noted_by' => null,
            'noted_at' => null,
            'review_requested_at' => null,
        ])->save();

        $this->recordActivity($scsr->case, $user, 'social_case_amended', "Social case study {$scsr->social_case_no} amended: {$reason}");

        return $scsr->refresh();
    }

    /**
     * The row the SCSR will live on. An explicit id must belong to this case;
     * with none supplied the latest assessment is promoted, and a case with no
     * assessment at all gets one created (which is why the store request
     * requires `classification` — the column is NOT NULL).
     */
    private function resolveAssessment(CaseModel $case, User $author, SocialCaseDto $dto, ?int $assessmentId): Assessment
    {
        if ($assessmentId !== null) {
            $assessment = $case->assessments()->whereKey($assessmentId)->first();

            if ($assessment === null) {
                throw ValidationException::withMessages([
                    'assessment_id' => 'The selected assessment does not belong to this case.',
                ]);
            }

            return $assessment;
        }

        $latest = $case->assessments()->latest('id')->first();

        if ($latest !== null) {
            return $latest;
        }

        if ($dto->classification === null) {
            throw ValidationException::withMessages([
                'classification' => 'This case has no assessment yet, so a classification is required to start its social case study.',
            ]);
        }

        return $case->assessments()->create([
            'created_by' => $author->id,
            'classification' => $dto->classification,
        ]);
    }

    /**
     * A snapshot, never a live join: a case can open with no intake at all, and
     * a case with three appended intakes has three referral sources of which
     * only one opened the episode. The same reasoning case_watchers uses for
     * `name` / `relationship`.
     *
     * @return array<string, mixed>
     */
    private function seedReferralFields(CaseModel $case, SocialCaseDto $dto): array
    {
        $supplied = $dto->toArray();

        if (array_key_exists('referral_source', $supplied) && array_key_exists('reason_for_referral', $supplied)) {
            return [];
        }

        $sheet = UnifiedIntakeSheet::query()
            ->where('case_id', $case->id)
            ->orderByRaw('CASE WHEN status = ? THEN 0 ELSE 1 END', [UnifiedIntakeSheet::STATUS_FINALIZED])
            ->latest('id')
            ->first();

        if ($sheet === null) {
            return [];
        }

        return [
            'referral_source' => $sheet->referral_source,
            'reason_for_referral' => $sheet->referral_details,
        ];
    }

    /**
     * Render the signed report and retain it as a case Document. One file per
     * finalization, named by control number and revision, so an amended and
     * re-finalized report leaves both copies on file.
     */
    private function archiveFinalizedPdf(Assessment $scsr, User $user): Document
    {
        $filename = $this->pdf->filename($scsr);
        $path = "social-case-studies/{$filename}";

        Storage::put($path, $this->pdf->render($scsr)->output());

        return Document::create([
            'case_id' => $scsr->case_id,
            'patient_id' => $scsr->case->patient_id,
            'uploaded_by' => $user->id,
            'document_type' => 'social_case_study',
            'file_name' => $filename,
            'file_path' => $path,
            'file_type' => 'application/pdf',
        ]);
    }

    private function assertEditable(Assessment $scsr): void
    {
        if (! $scsr->isSocialCaseEditable()) {
            throw ValidationException::withMessages([
                'social_case_status' => 'A finalized social case study must be amended before it can be edited.',
            ]);
        }
    }

    private function recordActivity(CaseModel $case, User $user, string $type, ?string $notes = null): void
    {
        CaseActivity::create([
            'case_id' => $case->id,
            'assigned_user_id' => $user->id,
            'activity_type' => $type,
            'activity_date' => now(),
            'notes' => $notes,
        ]);
    }
}
