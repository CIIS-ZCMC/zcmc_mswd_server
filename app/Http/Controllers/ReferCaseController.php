<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReferCaseRequest;
use App\Http\Resources\CaseModelResource;
use App\Models\CaseModel;
use App\Services\CaseModelService;

class ReferCaseController extends Controller
{
    public function __invoke(ReferCaseRequest $request, CaseModel $case, CaseModelService $service): CaseModelResource
    {
        return CaseModelResource::make($service->refer(
            $case,
            $request->user(),
            $request->validated('referred_to'),
            $request->validated('reason'),
            $request->validated('notes'),
        ));
    }
}
