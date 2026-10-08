<?php

namespace App\Http\Controllers;

use App\Services\DarReportService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The signed-in worker's DAR for one day as a PDF (inline, or `download=1`) or a CSV.
 * Only ever the caller's own lines.
 */
class DarExportController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:dar.manage')];
    }

    public function __invoke(Request $request, DarReportService $dar): Response|StreamedResponse
    {
        $validated = $request->validate([
            'date' => ['sometimes', 'date_format:Y-m-d'],
            'format' => ['sometimes', 'in:pdf,csv'],
        ]);

        $user = $request->user();
        $date = Carbon::parse($validated['date'] ?? today()->toDateString());

        if (($validated['format'] ?? 'pdf') === 'csv') {
            return $this->csv($dar->toRows($user, $date), $dar->filename($user, $date, 'csv'));
        }

        $pdf = $dar->renderPdf($user, $date);
        $filename = $dar->filename($user, $date, 'pdf');

        return $request->boolean('download')
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }

    /**
     * @param  array{headers: list<string>, rows: list<list<string|int|null>>}  $table
     */
    private function csv(array $table, string $filename): StreamedResponse
    {
        return response()->streamDownload(function () use ($table) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $table['headers']);

            foreach ($table['rows'] as $row) {
                fputcsv($handle, $row);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }
}
