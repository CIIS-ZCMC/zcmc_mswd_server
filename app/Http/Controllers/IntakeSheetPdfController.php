<?php

namespace App\Http\Controllers;

use App\Models\UnifiedIntakeSheet;
use App\Services\UnifiedIntakeSheetPdfService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class IntakeSheetPdfController extends Controller
{
    public function __invoke(Request $request, UnifiedIntakeSheet $intakeSheet, UnifiedIntakeSheetPdfService $pdfService): Response
    {
        $pdf = $pdfService->render($intakeSheet);
        $filename = $pdfService->filename($intakeSheet);

        return $request->boolean('download')
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }
}
