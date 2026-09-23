<?php

namespace App\Http\Controllers;

use App\Http\Resources\ServiceTypeResource;
use App\Services\ServiceTypeService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ServiceTypeController extends Controller
{
    public function __construct(protected ServiceTypeService $service) {}

    /**
     * List the hospital (SQL Server) service-type lookup rows.
     */
    public function index(): AnonymousResourceCollection
    {
        return ServiceTypeResource::collection($this->service->all());
    }
}
