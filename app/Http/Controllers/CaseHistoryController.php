<?php

namespace App\Http\Controllers;

use App\Http\Resources\ActivityResource;
use App\Models\CaseModel;
use App\Services\CaseModelService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CaseHistoryController extends Controller
{
    /**
     * Field-level audit trail for the case and its audited child records.
     */
    public function __invoke(
        Request $request,
        CaseModel $case,
        CaseModelService $service,
    ): AnonymousResourceCollection {
        // The viewer decides whether protective-case rows are visible.
        return ActivityResource::collection($service->history($case, $request->user()));
    }
}
