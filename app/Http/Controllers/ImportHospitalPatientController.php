<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreHospitalPatientImportRequest;
use App\Http\Resources\PatientResource;
use App\Services\HospitalPatientService;
use App\Services\PatientService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class ImportHospitalPatientController extends Controller
{
    /**
     * Import a hospital (HIS) patient into the local patients table, keyed on
     * hospital_id: creates the local record the first time, refreshes it after.
     */
    public function __invoke(
        StoreHospitalPatientImportRequest $request,
        int|string $id,
        HospitalPatientService $hospitalPatients,
        PatientService $patients,
    ): JsonResponse {
        $hospitalPatient = $hospitalPatients->find($id);

        $patient = $patients->storeFromHospitalPatient(
            $hospitalPatient,
            $request->integer('sector_id') ?: null,
        );

        return PatientResource::make($patient)
            ->response()
            ->setStatusCode($patient->wasRecentlyCreated ? Response::HTTP_CREATED : Response::HTTP_OK);
    }
}
