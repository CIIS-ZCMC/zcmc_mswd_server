<?php

namespace App\Http\Controllers;

use App\Http\Resources\TransactionTypeResource;
use App\Services\TransactionTypeService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TransactionTypeController extends Controller
{
    public function __construct(protected TransactionTypeService $service) {}

    /**
     * List the hospital (SQL Server) transaction-type lookup rows.
     */
    public function index(): AnonymousResourceCollection
    {
        return TransactionTypeResource::collection($this->service->all());
    }
}
