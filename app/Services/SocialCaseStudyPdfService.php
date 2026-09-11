<?php

namespace App\Services;

use App\Models\Assessment;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as PdfInstance;

class SocialCaseStudyPdfService
{
    /**
     * Relations printed on the report — eager-loaded together to avoid N+1.
     *
     * @var list<string>
     */
    private const RELATIONS = [
        'case.patient.sector',
        'case.patient.patientIds',
        'case.patient.familyMembers',
        'case.assignedUser',
        'case.watchers',
        'case.patientAssistances.assistantType',
        'case.interventions.interventionType',
        'expenses',
        'createdBy',
        'preparedBy',
        'notedBy',
    ];

    public function render(Assessment $scsr): PdfInstance
    {
        $scsr->loadMissing(self::RELATIONS);

        return Pdf::loadView('pdf.social-case-study', ['scsr' => $scsr])
            ->setPaper('a4', 'portrait');
    }

    /**
     * Revision-stamped: each finalization archives its own immutable copy, so
     * the filename has to distinguish them.
     */
    public function filename(Assessment $scsr): string
    {
        return "{$scsr->social_case_no}-r{$scsr->revision}.pdf";
    }
}
