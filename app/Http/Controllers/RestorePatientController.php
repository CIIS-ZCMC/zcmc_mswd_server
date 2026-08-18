<?php

namespace App\Http\Controllers;

use App\Http\Resources\PatientResource;
use App\Services\PatientService;

class RestorePatientController extends Controller
{
    public function __construct(protected PatientService $service) {}

    public function __invoke(int $id): PatientResource
    {
        return PatientResource::make($this->service->restore($id));
    }
}
