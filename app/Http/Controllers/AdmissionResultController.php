<?php

namespace App\Http\Controllers;

use App\Http\Resources\AdmissionResultResource;
use App\Services\AdmissionResultService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AdmissionResultController extends Controller
{
    public function __construct(protected AdmissionResultService $service) {}

    /**
     * List the hospital (SQL Server) admission-result lookup rows.
     */
    public function index(): AnonymousResourceCollection
    {
        return AdmissionResultResource::collection($this->service->all());
    }
}
