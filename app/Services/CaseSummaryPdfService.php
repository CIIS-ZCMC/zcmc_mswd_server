<?php

namespace App\Services;

use App\Models\CaseModel;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as PdfInstance;

/**
 * The endorsement/referral document: case header, the social case study body,
 * interventions, assistance and progress notes on one sheet.
 *
 * A case *document*, not a bulk extract, so it sits on `cases.view` — the same
 * reasoning that puts the intake PDF on `intake.view`.
 */
class CaseSummaryPdfService
{
    /**
     * @var list<string>
     */
    private const RELATIONS = [
        'patient.sector',
        'patient.patientIds',
        'patient.familyMembers',
        'assignedUser',
        'watchers',
        'socialCase.expenses',
        'socialCase.preparedBy',
        'socialCase.notedBy',
        'interventions.interventionType',
        'patientAssistances.assistantType',
        'progressNotes.author',
    ];

    public function render(CaseModel $case): PdfInstance
    {
        $case->loadMissing(self::RELATIONS);

        return Pdf::loadView('pdf.case-summary', ['case' => $case])
            ->setPaper('a4', 'portrait');
    }

    public function filename(CaseModel $case): string
    {
        return "{$case->case_code}-summary.pdf";
    }
}
