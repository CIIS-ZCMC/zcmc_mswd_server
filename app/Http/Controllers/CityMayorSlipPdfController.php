<?php

namespace App\Http\Controllers;

use App\Http\Requests\PrintCityMayorSlipRequest;
use App\Services\CityMayorSlipPdfService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Print the City Mayor Acknowledgement Slip (ZCMC-F-MSS-04) for a HIS encounter.
 * Serving the PDF is the print, logged unless `?preview=1`.
 */
class CityMayorSlipPdfController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:guarantee.view')];
    }

    public function __invoke(
        PrintCityMayorSlipRequest $request,
        int|string $id,
        CityMayorSlipPdfService $slips,
    ): Response|JsonResponse {
        try {
            $encounter = $slips->hisEncounter($id);
        } catch (QueryException $e) {
            report($e);

            return response()->json([
                'code' => 'his_unreachable',
                'message' => 'The hospital information system is unreachable. Try again shortly.',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $pdf = $slips->render($encounter, $request->safe()->only([
            'assistant_type_ids', 'fund', 'fund_other', 'amount', 'time_started', 'time_ended',
        ]), $request->user());

        if (! $request->boolean('preview')) {
            $slips->recordPrint($encounter, $request->user(), $request->validated('remarks'));
        }

        $filename = $slips->filename($encounter);

        return $request->boolean('download')
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }
}
