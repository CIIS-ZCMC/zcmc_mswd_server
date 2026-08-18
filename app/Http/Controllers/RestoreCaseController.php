<?php

namespace App\Http\Controllers;

use App\Http\Resources\CaseModelResource;
use App\Services\CaseModelService;

class RestoreCaseController extends Controller
{
    public function __invoke(int $id, CaseModelService $service): CaseModelResource
    {
        return CaseModelResource::make($service->restore($id));
    }
}
