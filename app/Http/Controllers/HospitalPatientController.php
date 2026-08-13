<?php

namespace App\Http\Controllers;

use App\Http\Requests\HospitalPatientIndexRequest;
use App\Http\Resources\HospitalPatientResource;
use App\Services\HospitalPatientService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class HospitalPatientController extends Controller
{
    public function __construct(protected HospitalPatientService $service) {}

    /**
     * Get hospital (SQL Server) patient records, optionally filtered by name.
     */
    public function index(HospitalPatientIndexRequest $request): AnonymousResourceCollection
    {
        $validated = $request->validated();

        return HospitalPatientResource::collection(
            $this->service->get($validated['search'] ?? null, $validated['limit'] ?? 100),
        );
    }

    /**
     * Find a single hospital patient by its HIS key (404 when not found).
     */
    public function show(int|string $id): HospitalPatientResource
    {
        return HospitalPatientResource::make($this->service->find($id));
    }
}
