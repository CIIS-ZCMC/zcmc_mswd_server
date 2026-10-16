<?php

namespace App\Http\Controllers;

use App\Http\Requests\CloseCaseRequest;
use App\Http\Resources\CaseModelResource;
use App\Models\CaseModel;
use App\Services\CaseModelService;

class CloseCaseController extends Controller
{
    public function __invoke(CloseCaseRequest $request, CaseModel $case, CaseModelService $service): CaseModelResource
    {
        return CaseModelResource::make(
            $service->close($case, $request->user(), $request->validated('reason'), $request->validated('notes')),
        );
    }
}
