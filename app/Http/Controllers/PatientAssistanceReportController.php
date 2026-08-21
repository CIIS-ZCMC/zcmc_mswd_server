<?php

namespace App\Http\Controllers;

use App\Http\Resources\PatientAssistanceReportResource;
use App\Models\PatientAssistance;
use App\Models\PatientAssistanceReport;
use App\Services\PatientAssistanceReportService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class PatientAssistanceReportController extends Controller implements HasMiddleware
{
    public function __construct(protected PatientAssistanceReportService $service) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:reports.view', only: ['index', 'forAssistance', 'show']),
            new Middleware('permission:reports.generate', only: ['void']),
        ];
    }

    /**
     * All released-aid reports, newest first.
     */
    public function index(): AnonymousResourceCollection
    {
        return PatientAssistanceReportResource::collection($this->service->list());
    }

    /**
     * The report(s) generated for a single assistance.
     */
    public function forAssistance(PatientAssistance $assistance): AnonymousResourceCollection
    {
        return PatientAssistanceReportResource::collection(
            $assistance->reports()->latest()->get(),
        );
    }

    public function show(PatientAssistanceReport $report): PatientAssistanceReportResource
    {
        return PatientAssistanceReportResource::make($report);
    }

    /**
     * Void a report issued in error, retaining it for audit.
     */
    public function void(PatientAssistanceReport $report): PatientAssistanceReportResource
    {
        return PatientAssistanceReportResource::make($this->service->void($report));
    }
}
