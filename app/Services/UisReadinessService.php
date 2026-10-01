<?php

namespace App\Services;

use App\Models\Assessment;
use App\Models\CaseModel;

/**
 * Tells a client whether a case's Unified Intake Sheet is ready to print, so it
 * can offer "Assess" or "Print". Read-only: the sheet itself is rendered by
 * UnifiedIntakeSheetPdfService.
 */
class UisReadinessService
{
    public function __construct(protected UnifiedIntakeSheetPdfService $sheet) {}

    /**
     * @return array<string, mixed>
     */
    public function summary(CaseModel $case): array
    {
        $assessment = $this->sheet->intakeAssessment($case);

        $missing = $assessment === null ? ['assessment'] : $this->missingSections($case, $assessment);

        return [
            'has_assessment' => $assessment !== null,
            'assessment_id' => $assessment?->id,
            'ready' => $missing === [],
            'missing' => $missing,
            'classification' => $assessment === null ? null : [
                'classification' => $assessment->classification,
                'calculated_classification' => $assessment->calculated_classification,
                'discount_rate' => $assessment->calculated_discount_rate,
                'net_per_capita_income' => $assessment->net_per_capita_income,
                'has_override' => $assessment->hasOverride(),
            ],
            'print_count' => $case->uisPrintLogs()->count(),
            'last_printed_at' => $case->uisPrintLogs()->max('printed_at'),
        ];
    }

    /**
     * The sections of the form a worker is expected to have filled in. A missing
     * one does not block printing — it is a hint for the client.
     *
     * @return list<string>
     */
    private function missingSections(CaseModel $case, Assessment $assessment): array
    {
        $missing = [];

        if (! filled($assessment->informant_name)) {
            $missing[] = 'informant';
        }
        if (! $case->patient?->familyMembers()->exists()) {
            $missing[] = 'family_composition';
        }
        if ($assessment->total_family_income === null) {
            $missing[] = 'family_income';
        }
        if (! filled($assessment->presenting_problem) && empty($assessment->problem_categories)) {
            $missing[] = 'problem_presented';
        }
        if (! filled($assessment->recommendation)
            && ! filled($assessment->recommended_assistance)
            && ! $case->patientAssistances()->exists()) {
            $missing[] = 'recommendation';
        }

        return $missing;
    }
}
