<?php

namespace App\Http\Controllers;

use App\Http\Requests\PatientRegisterIndexRequest;
use App\Http\Requests\PatientRegisterSearchRequest;
use App\Http\Resources\PatientRegisterResource;
use App\Services\PatientRegisterService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PatientRegisterController extends Controller
{
    public function __construct(protected PatientRegisterService $service) {}

    /**
     * Get a paginated list of hospital (SQL Server) patient registrations,
     * optionally filtered by name and/or registration date.
     */
    public function index(PatientRegisterIndexRequest $request): AnonymousResourceCollection
    {
        $validated = $request->validated();

        return PatientRegisterResource::collection(
            $this->service->paginate($validated['search'] ?? null, $validated['date'] ?? null, $validated['per_page'] ?? 15),
        );
    }

    /**
     * Find registrations by name and/or hospital number and/or registration date (404 when none match).
     */
    public function find(PatientRegisterSearchRequest $request): AnonymousResourceCollection
    {
        $validated = $request->validated();

        return PatientRegisterResource::collection(
            $this->service->findByNameAndHospitalNumber(
                $validated['name'] ?? null,
                $validated['hospital_number'] ?? null,
                $validated['date'] ?? null,
            ),
        );
    }

    /**
     * Find a single patient registration by its HIS key (404 when not found).
     */
    public function show(int|string $id): PatientRegisterResource
    {
        return PatientRegisterResource::make($this->service->find($id));
    }
}
