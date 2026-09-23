<?php

namespace App\Http\Controllers;

use App\Http\Resources\HospitalPatientImportBatchResource;
use App\Models\HospitalPatientImportBatch;

class ShowHospitalPatientImportBatchController extends Controller
{
    /**
     * The batch's current status, counts and per-row results (for polling).
     */
    public function __invoke(HospitalPatientImportBatch $importBatch): HospitalPatientImportBatchResource
    {
        return HospitalPatientImportBatchResource::make($importBatch->load('results'));
    }
}
