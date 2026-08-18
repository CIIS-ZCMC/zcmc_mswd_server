<?php

namespace App\Http\Controllers;

use App\Http\Resources\PatientResource;
use App\Models\Patient;
use App\Services\PatientService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PatientDuplicatesController extends Controller
{
    public function __construct(protected PatientService $service) {}

    /**
     * Candidate duplicate patients (same name + birthdate).
     */
    public function __invoke(Patient $patient): AnonymousResourceCollection
    {
        return PatientResource::collection($this->service->duplicatesOf($patient));
    }
}
