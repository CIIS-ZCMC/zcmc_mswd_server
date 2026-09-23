<?php

namespace App\Http\Controllers;

use App\Http\Requests\BatchImportHospitalPatientsRequest;
use App\Http\Resources\HospitalPatientImportBatchResource;
use App\Services\HospitalPatientImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class StoreHospitalPatientImportBatchController extends Controller
{
    /**
     * Queue a bulk import of the given HIS patients into the local patients
     * table. Returns the batch to poll (202); the work runs on the queue.
     */
    public function __invoke(BatchImportHospitalPatientsRequest $request, HospitalPatientImportService $imports): JsonResponse
    {
        $batch = $imports->importByIds(
            $request->validated('ids'),
            $request->integer('sector_id') ?: null,
            $request->user(),
        );

        return HospitalPatientImportBatchResource::make($batch->refresh()->load('results'))
            ->response()
            ->setStatusCode(Response::HTTP_ACCEPTED);
    }
}
