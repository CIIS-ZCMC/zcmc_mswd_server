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
     * Get a paginated list of hospital (SQL Server) patients, optionally
     * filtered by name.
     */
    public function index(HospitalPatientIndexRequest $request): AnonymousResourceCollection
    {
        $validated = $request->validated();

        return HospitalPatientResource::collection(
            $this->service->paginate($validated['search'] ?? null, $validated['per_page'] ?? 15),
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
