<?php

namespace App\Http\Controllers;

use App\Models\CaseModel;
use App\Services\UisPrintLogService;
use App\Services\UnifiedIntakeSheetPdfService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Print the Unified Intake Sheet (ANNEX B) for a case (= a hospital encounter).
 * The form is rendered on demand from the case's data — no intake record exists.
 * Serving the download IS the print, so it records a print-history row (unless
 * `?preview=1`, an on-screen preview that does not log).
 */
class CaseIntakeSheetPdfController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:intake.view')];
    }

    public function __invoke(
        Request $request,
        CaseModel $case,
        UnifiedIntakeSheetPdfService $pdfService,
        UisPrintLogService $printLog,
    ): Response {
        $pdf = $pdfService->renderForCase($case, $request->user());
        $filename = $pdfService->filenameForCase($case);

        if (! $request->boolean('preview')) {
            $printLog->record($case, $request->user());
        }

        return $request->boolean('download')
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }
}
