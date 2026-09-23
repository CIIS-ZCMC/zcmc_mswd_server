<?php

namespace App\Http\Controllers;

use App\Http\Resources\DiscountResource;
use App\Services\DiscountService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DiscountController extends Controller
{
    public function __construct(protected DiscountService $service) {}

    /**
     * List the hospital (SQL Server) discount lookup rows.
     */
    public function index(): AnonymousResourceCollection
    {
        return DiscountResource::collection($this->service->all());
    }
}
