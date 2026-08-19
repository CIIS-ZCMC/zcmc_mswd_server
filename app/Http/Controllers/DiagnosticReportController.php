<?php

namespace App\Http\Controllers;

use App\DTOs\DiagnosticReportDto;
use App\Http\Requests\StoreDiagnosticReportRequest;
use App\Http\Resources\DiagnosticReportResource;
use App\Models\Diagnostic;
use App\Models\DiagnosticReport;
use App\Services\DiagnosticReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class DiagnosticReportController extends Controller implements HasMiddleware
{
    public function __construct(protected DiagnosticReportService $service) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:cases.view', only: ['index']),
            new Middleware('permission:cases.update', only: ['store', 'destroy']),
        ];
    }

    public function index(Diagnostic $diagnostic): AnonymousResourceCollection
    {
        return DiagnosticReportResource::collection($diagnostic->reports()->latest()->get());
    }

    public function store(StoreDiagnosticReportRequest $request, Diagnostic $diagnostic): JsonResponse
    {
        $file = $request->file('file');
        $path = $file->store("cases/{$diagnostic->case_id}/diagnostic-reports");

        $report = $this->service->create(DiagnosticReportDto::fromArray([
            'diagnostic_id' => $diagnostic->id,
            'uploaded_by' => $request->user()->id,
            'report_type' => $request->validated('report_type'),
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_type' => $file->getClientMimeType(),
            'remarks' => $request->validated('remarks'),
        ]));

        return DiagnosticReportResource::make($report)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function destroy(DiagnosticReport $diagnosticReport): Response
    {
        $this->service->delete($diagnosticReport);

        return response()->noContent();
    }
}
