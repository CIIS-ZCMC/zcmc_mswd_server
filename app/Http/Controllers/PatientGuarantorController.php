<?php

namespace App\Http\Controllers;

use App\Http\Resources\PatientGuarantorResource;
use App\Services\PatientGuarantorService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PatientGuarantorController extends Controller
{
    public function __construct(protected PatientGuarantorService $service) {}

    /**
     * Guarantors recorded against a hospital (SQL Server) registration.
     * Empty when the admission has none — not a 404.
     */
    public function index(int|string $id): AnonymousResourceCollection
    {
        return PatientGuarantorResource::collection($this->service->forRegistration($id));
    }
}
