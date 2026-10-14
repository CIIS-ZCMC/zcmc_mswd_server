<?php

namespace App\Http\Controllers;

use App\Services\TurnaroundReportService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The turnaround time report as CSV (default) or PDF (`format=pdf`, inline unless
 * `download=1`). Gated on `reports.generate` like the social case export.
 */
class TurnaroundReportExportController extends Controller
{
    public function __invoke(Request $request, TurnaroundReportService $service): StreamedResponse|Response
    {
        $validated = $request->validate([
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d'],
            'format' => ['sometimes', 'in:csv,pdf'],
        ]);

        $summary = $service->summary($request->user(), $validated['from'] ?? null, $validated['to'] ?? null);
        $basename = $service->basename($summary);

        if (($validated['format'] ?? 'csv') === 'pdf') {
            $pdf = $service->renderPdf($summary);

            return $request->boolean('download')
                ? $pdf->download("{$basename}.pdf")
                : $pdf->stream("{$basename}.pdf");
        }

        $table = $service->toRows($summary);

        return response()->streamDownload(function () use ($table) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $table['headers']);

            foreach ($table['rows'] as $row) {
                fputcsv($handle, $row);
            }

            fclose($handle);
        }, "{$basename}.csv", ['Content-Type' => 'text/csv']);
    }
}
