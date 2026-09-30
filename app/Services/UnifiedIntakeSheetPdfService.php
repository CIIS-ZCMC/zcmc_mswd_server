<?php

namespace App\Services;

use App\Models\CaseModel;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as PdfInstance;

/**
 * Renders the Unified Intake Sheet (ANNEX B) — a printable of a case's data.
 * There is no stored intake record: the form is built on demand from the case
 * (= a hospital encounter), its patient and its latest intake assessment.
 * Each print is logged separately by UisPrintLogService.
 */
class UnifiedIntakeSheetPdfService
{
    /**
     * Relations the form reads, eager-loaded together to avoid N+1.
     *
     * @var list<string>
     */
    private const CASE_RELATIONS = [
        'patient.patientIds',
        'patient.familyMembers',
        'patient.sector',
        'patientAssistances.assistantType',
    ];

    public function renderForCase(CaseModel $case, ?User $printedBy = null): PdfInstance
    {
        $case->loadMissing(self::CASE_RELATIONS);

        // The intake-time socioeconomic snapshot (social_case_status IS NULL);
        // the SCSR assessment is deliberately excluded. See the Assessment model.
        $assessment = $case->assessments()
            ->whereNull('social_case_status')
            ->latest()
            ->first();

        $assessment?->loadMissing('expenses');

        return Pdf::loadView('pdf.unified-intake-sheet', [
            'patient' => $case->patient,
            'case' => $case,
            'assessment' => $assessment,
            'printedBy' => $printedBy,
            'printedAt' => now(),
        ])->setPaper('a4', 'portrait');
    }

    public function filenameForCase(CaseModel $case): string
    {
        return "UIS-{$case->case_code}.pdf";
    }
}
