<?php

namespace App\Http\Controllers;

use App\Http\Requests\PrintAcknowledgementSlipRequest;
use App\Models\PatientGuarantee;
use App\Services\AcknowledgementSlipPdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Print the DOH-MAIFIP Acknowledgement Slip (ZCMC-F-MSWD-46) for a MAIFIP
 * guarantee. Serving the PDF is the print, so it records a print-history row
 * unless `?preview=1`. Another guarantor's guarantee is a 422: the slip is the
 * MAIFIP form only.
 */
class GuaranteeAcknowledgementSlipPdfController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:guarantee.view')];
    }

    public function __invoke(
        PrintAcknowledgementSlipRequest $request,
        PatientGuarantee $guarantee,
        AcknowledgementSlipPdfService $slips,
    ): Response|JsonResponse {
        if (! $guarantee->guarantor?->isMaifip()) {
            return response()->json([
                'code' => 'not_maifip',
                'message' => 'The Acknowledgement Slip prints for MAIFIP guarantees only.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $pdf = $slips->render(
            $guarantee,
            $request->user(),
            $request->validated('time_started'),
            $request->validated('time_ended'),
        );

        if (! $request->boolean('preview')) {
            $slips->recordPrint(
                $guarantee,
                $request->user(),
                $request->integer('copies', 1),
                $request->validated('remarks'),
            );
        }

        $filename = $slips->filename($guarantee);

        return $request->boolean('download')
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }
}
