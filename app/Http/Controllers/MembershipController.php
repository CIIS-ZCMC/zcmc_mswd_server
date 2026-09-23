<?php

namespace App\Http\Controllers;

use App\Http\Resources\MembershipResource;
use App\Services\MembershipService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MembershipController extends Controller
{
    public function __construct(protected MembershipService $service) {}

    /**
     * List the hospital (SQL Server) PhilHealth membership lookup rows.
     */
    public function index(): AnonymousResourceCollection
    {
        return MembershipResource::collection($this->service->all());
    }
}
