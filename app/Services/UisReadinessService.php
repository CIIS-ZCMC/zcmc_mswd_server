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
        return $this->build(
            assessment: $this->sheet->intakeAssessment($case),
            hasFamily: (bool) $case->patient?->familyMembers()->exists(),
            hasAssistance: $case->patientAssistances()->exists(),
            printCount: $case->uisPrintLogs()->count(),
            lastPrintedAt: $case->uisPrintLogs()->max('printed_at'),
        );
    }

    /**
     * The same summary from values the caller already loaded — lets a list of
     * cases (a patient's UIS tab) be built without a query per case.
     *
     * @return array<string, mixed>
     */
    public function build(
        ?Assessment $assessment,
        bool $hasFamily,
        bool $hasAssistance,
        int $printCount,
        ?string $lastPrintedAt,
    ): array {
        $missing = $assessment === null ? ['assessment'] : $this->missingSections($assessment, $hasFamily, $hasAssistance);

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
            'print_count' => $printCount,
            'last_printed_at' => $lastPrintedAt,
        ];
    }

    /**
     * The sections of the form a worker is expected to have filled in. A missing
     * one does not block printing — it is a hint for the client.
     *
     * @return list<string>
     */
    private function missingSections(Assessment $assessment, bool $hasFamily, bool $hasAssistance): array
    {
        $missing = [];

        if (! filled($assessment->informant_name)) {
            $missing[] = 'informant';
        }
        if (! $hasFamily) {
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
            && ! $hasAssistance) {
            $missing[] = 'recommendation';
        }

        return $missing;
    }
}
