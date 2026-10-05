<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Services\PatientSocioeconomicService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * A patient's socio-economic profile in one request: household, current income /
 * living conditions / list of expenses (the newest intake assessment) and a short
 * history for the trend. Backs the patient-page Socio-Economic tab.
 */
class PatientSocioeconomicController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:intake.view')];
    }

    public function __invoke(Patient $patient, PatientSocioeconomicService $service): JsonResponse
    {
        return response()->json(['data' => $service->build($patient)]);
    }
}
