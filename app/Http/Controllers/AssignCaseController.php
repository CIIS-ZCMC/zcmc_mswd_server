<?php

namespace App\Http\Controllers;

use App\Http\Requests\AssignCaseRequest;
use App\Http\Resources\CaseModelResource;
use App\Models\CaseModel;
use App\Models\User;
use App\Services\CaseModelService;

class AssignCaseController extends Controller
{
    public function __invoke(AssignCaseRequest $request, CaseModel $case, CaseModelService $service): CaseModelResource
    {
        $worker = User::findOrFail($request->validated('assigned_user_id'));

        return CaseModelResource::make($service->assign($case, $worker, $request->user()));
    }
}
