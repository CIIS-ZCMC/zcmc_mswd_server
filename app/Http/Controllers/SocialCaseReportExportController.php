<?php

namespace App\Http\Controllers;

use App\Services\SocialCaseReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Gated on `reports.generate`, not `reports.view`: Case Manager holds the
 * latter but not the former, so the on-screen dashboard stays available to
 * them while bulk PHI extraction stays with Supervisor and above.
 */
class SocialCaseReportExportController extends Controller
{
    public function __invoke(Request $request, SocialCaseReportService $service): StreamedResponse|Response
    {
        $summary = $service->summary($request->user(), $request->query('from'), $request->query('to'));
        $basename = "social-cases-{$summary['from']}-to-{$summary['to']}";

        if ($request->query('format') === 'pdf') {
            $pdf = Pdf::loadView('pdf.social-case-report', ['summary' => $summary])->setPaper('a4', 'portrait');

            return $request->boolean('download')
                ? $pdf->download("{$basename}.pdf")
                : $pdf->stream("{$basename}.pdf");
        }

        return $this->csv($service->toRows($summary), "{$basename}.csv");
    }

    /**
     * @param  array{headers: list<string>, rows: list<list<string|int>>}  $table
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
