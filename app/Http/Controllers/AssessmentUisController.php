<?php

namespace App\Http\Controllers;

use App\Http\Requests\PrintUisRequest;
use App\Http\Resources\UisPrintLogResource;
use App\Models\Assessment;
use App\Services\UisPrintLogService;
use App\Services\UisReadinessService;
use App\Services\UnifiedIntakeSheetPdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * The Unified Intake Sheet (ANNEX B) of an Intake Assessment, with or without a
 * case: readiness, the PDF (serving it is the print, logged unless
 * `?preview=1`) and the encounter's print history. A Social Case Study row is
 * not an intake and answers 404.
 */
class AssessmentUisController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:intake.view')];
    }

    public function readiness(Assessment $assessment, UisReadinessService $readiness): JsonResponse
    {
        $this->ensureIntake($assessment);

        return response()->json(['data' => $readiness->summaryForAssessment($assessment)]);
    }

    public function pdf(
        PrintUisRequest $request,
        Assessment $assessment,
        UnifiedIntakeSheetPdfService $pdfService,
        UisPrintLogService $printLog,
    ): Response {
        $this->ensureIntake($assessment);

        $pdf = $pdfService->renderForAssessment($assessment, $request->user());
        $filename = $pdfService->filenameForAssessment($assessment);

        if (! $request->boolean('preview')) {
            $printLog->recordForAssessment(
                $assessment,
                $request->user(),
                $request->integer('copies', 1),
                $request->validated('remarks'),
            );
        }

        return $request->boolean('download')
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }

    public function prints(Assessment $assessment, UisPrintLogService $printLog): AnonymousResourceCollection
    {
        $this->ensureIntake($assessment);

        return UisPrintLogResource::collection($printLog->historyForAssessment($assessment));
    }

    private function ensureIntake(Assessment $assessment): void
    {
        abort_if($assessment->isSocialCase(), Response::HTTP_NOT_FOUND);
    }
}
