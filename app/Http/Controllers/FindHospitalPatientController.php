<?php

namespace App\Http\Controllers;

use App\Http\Requests\HospitalPatientSearchRequest;
use App\Http\Resources\HospitalPatientResource;
use App\Services\HospitalPatientService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FindHospitalPatientController extends Controller
{
    public function __construct(protected HospitalPatientService $service) {}

    /**
     * Find patients by name and/or hospital number (404 when none match).
     */
    public function __invoke(HospitalPatientSearchRequest $request): AnonymousResourceCollection
    {
        $validated = $request->validated();

        return HospitalPatientResource::collection(
            $this->service->findByNameAndHospitalNumber(
                $validated['name'] ?? null,
                $validated['hospital_number'] ?? null,
            ),
        );
    }
}
