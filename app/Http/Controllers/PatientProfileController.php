<?php

namespace App\Http\Controllers;

use App\Http\Resources\PatientResource;
use App\Models\Patient;
use App\Services\PatientService;

class PatientProfileController extends Controller
{
    public function __construct(protected PatientService $service) {}

    /**
     * Consolidated 360 profile: demographics, records, relationships.
     */
    public function __invoke(Patient $patient): PatientResource
    {
        return PatientResource::make($this->service->profile($patient));
    }
}
