<?php

namespace App\Http\Controllers;

use App\Http\Resources\CaseModelResource;
use App\Models\CaseModel;
use App\Services\CaseModelService;

class CaseProfileController extends Controller
{
    /**
     * Consolidated case profile: patient, worker, and record counts.
     */
    public function __invoke(CaseModel $case, CaseModelService $service): CaseModelResource
    {
        return CaseModelResource::make($service->profile($case));
    }
}
