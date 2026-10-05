<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Services\PatientSocioeconomicService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * A patient's socio-economic overview in one request: live household, the current
 * dated profile (income, living conditions, list of expenses) and a short history.
 * Patient-level — no case is involved.
 */
class PatientSocioeconomicController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:socioeconomic.view')];
    }

    public function __invoke(Patient $patient, PatientSocioeconomicService $service): JsonResponse
    {
        return response()->json(['data' => $service->overview($patient)]);
    }
}
