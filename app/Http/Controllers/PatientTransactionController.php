<?php

namespace App\Http\Controllers;

use App\Http\Requests\PatientTransactionIndexRequest;
use App\Http\Resources\PatientTransactionResource;
use App\Services\PatientTransactionService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PatientTransactionController extends Controller
{
    public function __construct(protected PatientTransactionService $service) {}

    /**
     * Get a paginated list of hospital (SQL Server) patient transactions,
     * optionally filtered by name and/or registration date (registrydate).
     */
    public function index(PatientTransactionIndexRequest $request): AnonymousResourceCollection
    {
        $validated = $request->validated();

        return PatientTransactionResource::collection(
            $this->service->paginate($validated['search'] ?? null, $validated['date'] ?? null, $validated['per_page'] ?? 15),
        );
    }

    /**
     * Find a single patient transaction by its HIS key (404 when not found).
     */
    public function show(int|string $id): PatientTransactionResource
    {
        return PatientTransactionResource::make($this->service->find($id));
    }
}
