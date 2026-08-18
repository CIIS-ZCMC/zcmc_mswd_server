<?php

namespace App\Http\Controllers;

use App\Http\Resources\ActivityResource;
use App\Models\CaseModel;
use App\Services\CaseModelService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CaseHistoryController extends Controller
{
    /**
     * Field-level audit trail for the case and its audited child records.
     */
    public function __invoke(CaseModel $case, CaseModelService $service): AnonymousResourceCollection
    {
        return ActivityResource::collection($service->history($case));
    }
}
