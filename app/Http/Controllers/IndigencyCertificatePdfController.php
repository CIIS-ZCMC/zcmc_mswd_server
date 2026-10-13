<?php

namespace App\Http\Controllers;

use App\Http\Requests\PrintIndigencyCertificateRequest;
use App\Services\IndigencyCertificatePdfService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Print the Certificate of Eligibility (Indigency), Annex A, for a HIS encounter.
 * Serving the PDF is the print, logged unless `?preview=1`.
 */
class IndigencyCertificatePdfController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:guarantee.view')];
    }

    public function __invoke(
        PrintIndigencyCertificateRequest $request,
        int|string $id,
        IndigencyCertificatePdfService $certificates,
    ): Response|JsonResponse {
        try {
            $encounter = $certificates->hisEncounter($id);
        } catch (QueryException $e) {
            report($e);

            return response()->json([
                'code' => 'his_unreachable',
                'message' => 'The hospital information system is unreachable. Try again shortly.',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $pdf = $certificates->render($encounter, $request->safe()->only(['assistant_type_ids', 'classification']));

        if (! $request->boolean('preview')) {
            $certificates->recordPrint($encounter, $request->user(), $request->validated('remarks'));
        }

        $filename = $certificates->filename($encounter);

        return $request->boolean('download')
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }
}
