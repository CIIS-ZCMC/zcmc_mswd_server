<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReopenCaseRequest;
use App\Http\Resources\CaseModelResource;
use App\Models\CaseModel;
use App\Services\CaseModelService;

class ReopenCaseController extends Controller
{
    public function __invoke(ReopenCaseRequest $request, CaseModel $case, CaseModelService $service): CaseModelResource
    {
        return CaseModelResource::make($service->reopen($case, $request->user(), $request->validated('reason')));
    }
}
