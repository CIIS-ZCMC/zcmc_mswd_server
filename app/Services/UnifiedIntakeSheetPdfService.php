<?php

namespace App\Services;

use App\Models\UnifiedIntakeSheet;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as PdfInstance;

class UnifiedIntakeSheetPdfService
{
    /**
     * Relations printed on the sheet — eager-loaded together to avoid N+1.
     *
     * @var list<string>
     */
    private const RELATIONS = [
        'patient.patientIds',
        'patient.familyMembers',
        'patient.watchers',
        'patient.sector',
        'case.assignedUser',
        'case.patientAssistances.assistantType',
        'assessment',
        'intakeWorker',
        'finalizer',
    ];

    public function render(UnifiedIntakeSheet $sheet): PdfInstance
    {
        $sheet->loadMissing(self::RELATIONS);

        return Pdf::loadView('pdf.unified-intake-sheet', ['sheet' => $sheet])
            ->setPaper('a4', 'portrait');
    }

    public function filename(UnifiedIntakeSheet $sheet): string
    {
        return "{$sheet->intake_no}.pdf";
    }
}
