<?php

namespace App\Services;

use App\Models\Assessment;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\PatientGuarantee;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as PdfInstance;
use Illuminate\Support\Collection;

/**
 * Renders the Unified Intake Sheet (ANNEX B) of an Intake Assessment: the
 * patient, the assessment, and the guarantors on its HIS encounter (section V).
 * The intake stands without a case; a case-based print resolves the case's
 * intake. Each print is logged separately by UisPrintLogService. See
 * docs/INTAKE_ASSESSMENT_PLAN.md.
 */
class UnifiedIntakeSheetPdfService
{
    /**
     * Patient relations the form reads, eager-loaded together to avoid N+1.
     *
     * @var list<string>
     */
    private const PATIENT_RELATIONS = ['patientIds', 'familyMembers', 'sector'];

    /**
     * The intake-time socioeconomic snapshot (social_case_status IS NULL); the
     * SCSR assessment is deliberately excluded. See the Assessment model.
     */
    public function intakeAssessment(CaseModel $case): ?Assessment
    {
        return $case->assessments()
            ->whereNull('social_case_status')
            ->latest()
            ->latest('id')
            ->first();
    }

    public function renderForAssessment(Assessment $assessment, ?User $printedBy = null): PdfInstance
    {
        return $this->render(
            $assessment->patient ?? $assessment->case?->patient,
            $assessment->his_transaction_id,
            $assessment->case,
            $assessment,
            $printedBy,
        );
    }

    /** The case's intake, or the blank form when it has none (`?blank=1`). */
    public function renderForCase(CaseModel $case, ?User $printedBy = null): PdfInstance
    {
        return $this->render($case->patient, $case->transaction_id, $case, $this->intakeAssessment($case), $printedBy);
    }

    public function filenameForAssessment(Assessment $assessment): string
    {
        return $assessment->case?->case_code
            ? "UIS-{$assessment->case->case_code}.pdf"
            : "UIS-{$assessment->patient?->hospital_id}-ENC-{$assessment->his_transaction_id}.pdf";
    }

    public function filenameForCase(CaseModel $case): string
    {
        return "UIS-{$case->case_code}.pdf";
    }

    /**
     * Section V's lines: each guarantee item on the encounter (type, amount,
     * mode, fund). An encounter with no guarantors falls back to the case's
     * recorded assistances, which carry no mode or fund.
     *
     * @return Collection<int, array{type: ?string, amount: mixed, mode: ?string, fund: ?string}>
     */
    public function assistanceLines(Patient $patient, int|string|null $transactionId, ?CaseModel $case): Collection
    {
        $guaranteeLines = $transactionId === null ? collect() : PatientGuarantee::query()
            ->where('patient_id', $patient->id)
            ->where('his_transaction_id', $transactionId)
            ->with(['guarantor', 'items.assistanceType', 'items.modeOfAssistance', 'items.fundSource'])
            ->oldest('id')
            ->get()
            ->flatMap(fn (PatientGuarantee $guarantee) => $guarantee->items->map(fn ($item) => [
                'type' => $item->assistanceType?->name,
                'amount' => $item->amount,
                'mode' => $item->modeOfAssistance?->name,
                'fund' => $item->fundSource?->name ?? $guarantee->guarantor?->name,
            ]));

        if ($guaranteeLines->isNotEmpty() || $case === null) {
            return $guaranteeLines->values();
        }

        return $case->patientAssistances()->with('assistantType')->get()->map(fn ($aid) => [
            'type' => $aid->assistantType?->name,
            'amount' => $aid->amount,
            'mode' => null,
            'fund' => null,
        ]);
    }

    private function render(
        ?Patient $patient,
        int|string|null $transactionId,
        ?CaseModel $case,
        ?Assessment $assessment,
        ?User $printedBy,
    ): PdfInstance {
        $patient?->loadMissing(self::PATIENT_RELATIONS);
        $assessment?->loadMissing('expenses');

        return Pdf::loadView('pdf.unified-intake-sheet', [
            'patient' => $patient,
            'case' => $case,
            'assessment' => $assessment,
            'assistanceLines' => $patient === null ? collect() : $this->assistanceLines($patient, $transactionId, $case),
            'printedBy' => $printedBy,
            'printedAt' => now(),
        ])->setPaper('a4', 'portrait');
    }
}
