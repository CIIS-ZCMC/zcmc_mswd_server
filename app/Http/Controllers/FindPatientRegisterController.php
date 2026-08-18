<?php

namespace App\Http\Controllers;

use App\Http\Requests\PatientRegisterSearchRequest;
use App\Http\Resources\PatientRegisterResource;
use App\Services\PatientRegisterService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FindPatientRegisterController extends Controller
{
    public function __construct(protected PatientRegisterService $service) {}

    /**
     * Find registrations by name and/or hospital number and/or registration date (404 when none match).
     */
    public function __invoke(PatientRegisterSearchRequest $request): AnonymousResourceCollection
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
}
