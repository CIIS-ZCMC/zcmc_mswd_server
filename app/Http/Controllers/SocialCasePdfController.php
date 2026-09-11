<?php

namespace App\Http\Controllers;

use App\Models\CaseModel;
use App\Services\SocialCaseService;
use App\Services\SocialCaseStudyPdfService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SocialCasePdfController extends Controller
{
    public function __invoke(Request $request, CaseModel $case, SocialCaseService $service, SocialCaseStudyPdfService $pdfService): Response
    {
        $scsr = $service->find($case);
        $pdf = $pdfService->render($scsr);
        $filename = $pdfService->filename($scsr);

        return $request->boolean('download')
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }
}
