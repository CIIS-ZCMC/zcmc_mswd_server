<?php

namespace App\Http\Controllers;

use App\Http\Requests\PrintAcknowledgementSlipRequest;
use App\Services\AcknowledgementSlipPdfService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Print the DOH-MAIFIP Acknowledgement Slip straight from a HIS encounter's
 * MAIFIP guarantor ledger entry (psGntrLedgers), for when the MSWD has not
 * recorded its own guarantee. `?entry=` picks the ledger row; the first MAIFIP
 * row otherwise. HIS records no types of assistance, so `?assistant_type_ids=3,4`
 * supplies the "para sa" line. Serving the PDF is the print, logged unless
 * `?preview=1`.
 */
class EncounterAcknowledgementSlipPdfController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:guarantee.view')];
    }

    public function __invoke(
        PrintAcknowledgementSlipRequest $request,
        int|string $id,
        AcknowledgementSlipPdfService $slips,
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

        $entries = $slips->hisMaifipEntries($encounter);
        $entry = $request->filled('entry')
            ? $entries->first(fn ($row) => (string) $row->getKey() === (string) $request->validated('entry'))
            : $entries->first();

        $fund = $request->validated('fund') ?? 'doh_maifip';
        $fundOther = $request->validated('fund_other');
        $assistantTypeIds = array_map('intval', $request->validated('assistant_type_ids') ?? []);

        if ($entry !== null && ! $request->filled('amount')) {
            $pdf = $slips->renderFromHis(
                $encounter,
                $entry,
                $request->user(),
                $request->validated('time_started'),
                $request->validated('time_ended'),
                $assistantTypeIds,
                $fund,
                $fundOther,
            );

            if (! $request->boolean('preview')) {
                $slips->recordHisPrint(
                    $encounter,
                    $entry,
                    $request->user(),
                    $request->integer('copies', 1),
                    $request->validated('remarks'),
                );
            }

            $filename = $slips->filenameFromHis($encounter, $entry);
        } else {
            $amount = $request->filled('amount') ? (float) $request->validated('amount') : ($entry ? (float) $entry->amount : null);
            $pdf = $slips->renderFromEncounter(
                $encounter,
                $request->user(),
                $request->validated('time_started'),
                $request->validated('time_ended'),
                $amount,
                $assistantTypeIds,
                $fund,
                $fundOther,
            );

            if (! $request->boolean('preview')) {
                $slips->recordEncounterPrint(
                    $encounter,
                    $request->user(),
                    $request->integer('copies', 1),
                    $request->validated('remarks'),
                );
            }

            $filename = $slips->filenameFromEncounter($encounter);
        }

        return $request->boolean('download')
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }
}
