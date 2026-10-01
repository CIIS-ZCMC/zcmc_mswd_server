<?php

namespace App\Http\Controllers;

use App\Http\Requests\PrintUisRequest;
use App\Models\CaseModel;
use App\Services\UisPrintLogService;
use App\Services\UnifiedIntakeSheetPdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Print the Unified Intake Sheet (ANNEX B) for a case (= a hospital encounter).
 * The form is rendered on demand from the case's data — no intake record exists.
 * Serving the download IS the print, so it records a print-history row (unless
 * `?preview=1`, an on-screen preview that does not log). `copies` and `remarks`
 * are stored on the print row. A case with no intake assessment is a 409 unless
 * `?blank=1` asks for the blank fillable form.
 */
class CaseIntakeSheetPdfController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:intake.view')];
    }

    public function __invoke(
        PrintUisRequest $request,
        CaseModel $case,
        UnifiedIntakeSheetPdfService $pdfService,
        UisPrintLogService $printLog,
    ): Response|JsonResponse {
        // A sheet with no assessment behind it would print as a blank form
        // without anyone noticing; make the client opt in with ?blank=1.
        if (! $request->boolean('blank') && $pdfService->intakeAssessment($case) === null) {
            return response()->json([
                'code' => 'uis_no_assessment',
                'message' => 'This case has no intake assessment yet. Assess first, or pass blank=1 to print a blank form.',
            ], Response::HTTP_CONFLICT);
        }

        $pdf = $pdfService->renderForCase($case, $request->user());
        $filename = $pdfService->filenameForCase($case);

        if (! $request->boolean('preview')) {
            $printLog->record(
                $case,
                $request->user(),
                $request->integer('copies', 1),
                $request->validated('remarks'),
            );
        }

        return $request->boolean('download')
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }
}
