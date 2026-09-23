<?php

namespace App\Http\Controllers;

use App\Http\Resources\HospitalCaseTypeResource;
use App\Services\HospitalCaseTypeService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class HospitalCaseTypeController extends Controller
{
    public function __construct(protected HospitalCaseTypeService $service) {}

    /**
     * List the hospital (SQL Server) case-type lookup rows.
     */
    public function index(): AnonymousResourceCollection
    {
        return HospitalCaseTypeResource::collection($this->service->all());
    }
}
