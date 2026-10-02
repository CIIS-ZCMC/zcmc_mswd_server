<?php

namespace App\Http\Controllers;

use App\Http\Resources\AssessmentResource;
use App\Models\Patient;
use App\Services\UisReadinessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * A patient's Unified Intake Sheets in one request: every case (= hospital
 * encounter) with its intake assessment, readiness and print stats. Backs the
 * patient-page UIS tab, which would otherwise need a request per case.
 *
 * The UIS is the case's intake-time assessment (social_case_status IS NULL), the
 * same row UnifiedIntakeSheetPdfService prints; `has_social_case` flags a case
 * whose assessment was promoted to the SCSR (and so no longer prints as a UIS).
 */
class PatientUisController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:intake.view')];
    }

    public function __invoke(Request $request, Patient $patient, UisReadinessService $readiness): JsonResponse
    {
        $hasFamily = $patient->familyMembers()->exists();

        $cases = $patient->cases()
            ->with(['assessments' => fn ($query) => $query
                ->whereNull('social_case_status')
                ->with('expenses')
                ->latest()->latest('id')])
            ->withExists(['patientAssistances', 'socialCase'])
            ->withCount('uisPrintLogs')
            ->withMax('uisPrintLogs', 'printed_at')
            ->latest('date_opened')->latest('id')
            ->get();

        $rows = $cases->map(function ($case) use ($readiness, $hasFamily, $request) {
            $assessment = $case->assessments->first();

            return [
                'case' => [
                    'id' => $case->id,
                    'case_code' => $case->case_code,
                    'status' => $case->status,
                    'transaction_id' => $case->transaction_id,
                    'transaction_type' => $case->transaction_type,
                    'date_opened' => $case->date_opened,
                ],
                'uis' => $readiness->build(
                    assessment: $assessment,
                    hasFamily: $hasFamily,
                    hasAssistance: (bool) $case->patient_assistances_exists,
                    printCount: (int) $case->uis_print_logs_count,
                    lastPrintedAt: $case->uis_print_logs_max_printed_at,
                ) + [
                    'has_social_case' => (bool) $case->social_case_exists,
                    'assessment' => $assessment === null ? null : AssessmentResource::make($assessment)->resolve($request),
                ],
            ];
        });

        return response()->json(['data' => $rows->values()]);
    }
}
