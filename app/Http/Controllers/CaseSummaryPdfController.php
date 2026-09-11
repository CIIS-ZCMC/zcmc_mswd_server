<?php

namespace App\Http\Controllers;

use App\Models\CaseModel;
use App\Services\CaseSummaryPdfService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CaseSummaryPdfController extends Controller
{
    public function __invoke(Request $request, CaseModel $case, CaseSummaryPdfService $pdfService): Response
    {
        $pdf = $pdfService->render($case);
        $filename = $pdfService->filename($case);

        return $request->boolean('download')
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }
}
