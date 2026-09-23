<?php

namespace App\Http\Controllers;

use App\Http\Resources\HospitalPlanResource;
use App\Services\HospitalPlanService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class HospitalPlanController extends Controller
{
    public function __construct(protected HospitalPlanService $service) {}

    /**
     * List the hospital (SQL Server) hospital-plan lookup rows.
     */
    public function index(): AnonymousResourceCollection
    {
        return HospitalPlanResource::collection($this->service->all());
    }
}
