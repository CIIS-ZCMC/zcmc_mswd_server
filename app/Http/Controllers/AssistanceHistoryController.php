<?php

namespace App\Http\Controllers;

use App\Http\Resources\ActivityResource;
use App\Models\PatientAssistance;
use App\Services\PatientAssistanceService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AssistanceHistoryController extends Controller
{
    /**
     * Field-level audit trail for a single assistance.
     */
    public function __invoke(PatientAssistance $assistance, PatientAssistanceService $service): AnonymousResourceCollection
    {
        return ActivityResource::collection($service->history($assistance));
    }
}
