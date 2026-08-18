<?php

namespace App\Http\Controllers;

use App\Http\Resources\CaseModelResource;
use App\Models\CaseModel;
use App\Services\CaseModelService;
use Illuminate\Http\Request;

class ReopenCaseController extends Controller
{
    public function __invoke(Request $request, CaseModel $case, CaseModelService $service): CaseModelResource
    {
        return CaseModelResource::make($service->reopen($case, $request->user()));
    }
}
