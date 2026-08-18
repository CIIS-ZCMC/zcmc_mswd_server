<?php

namespace App\Http\Controllers;

use App\Http\Resources\CaseModelResource;
use App\Models\CaseModel;
use App\Services\CaseModelService;
use Illuminate\Http\Request;

class ReferCaseController extends Controller
{
    public function __invoke(Request $request, CaseModel $case, CaseModelService $service): CaseModelResource
    {
        $notes = $request->validate(['notes' => ['nullable', 'string']])['notes'] ?? null;

        return CaseModelResource::make($service->refer($case, $request->user(), $notes));
    }
}
