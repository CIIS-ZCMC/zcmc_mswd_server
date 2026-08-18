<?php

namespace App\Http\Controllers;

use App\Http\Resources\ActivityResource;
use App\Models\Patient;
use App\Services\PatientService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PatientHistoryController extends Controller
{
    public function __construct(protected PatientService $service) {}

    public function __invoke(Patient $patient): AnonymousResourceCollection
    {
        return ActivityResource::collection($this->service->history($patient));
    }
}
