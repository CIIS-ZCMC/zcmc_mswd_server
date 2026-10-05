<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSocioeconomicProfileRequest;
use App\Http\Requests\UpdateSocioeconomicProfileRequest;
use App\Models\Patient;
use App\Models\PatientSocioeconomicProfile;
use App\Services\PatientSocioeconomicService;
use App\Services\SocioeconomicProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Dated List of Expenses records of a patient. Independent of cases and the UIS.
 */
class SocioeconomicProfileController extends Controller implements HasMiddleware
{
    public function __construct(
        protected SocioeconomicProfileService $service,
        protected PatientSocioeconomicService $presenter,
    ) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:socioeconomic.view', only: ['show']),
            new Middleware('permission:socioeconomic.create', only: ['store']),
            new Middleware('permission:socioeconomic.update', only: ['update']),
            new Middleware('permission:socioeconomic.delete', only: ['destroy']),
        ];
    }

    public function show(PatientSocioeconomicProfile $profile): JsonResponse
    {
        return response()->json(['data' => $this->presenter->present($profile)]);
    }

    public function store(StoreSocioeconomicProfileRequest $request, Patient $patient): JsonResponse
    {
        $profile = $this->service->create($patient, $request->validated(), (int) $request->user()->id);

        return response()->json(
            ['data' => $this->presenter->present($profile)],
            Response::HTTP_CREATED,
        );
    }

    public function update(UpdateSocioeconomicProfileRequest $request, PatientSocioeconomicProfile $profile): JsonResponse
    {
        $profile = $this->service->update($profile, $request->validated());

        return response()->json(['data' => $this->presenter->present($profile)]);
    }

    public function destroy(PatientSocioeconomicProfile $profile): Response
    {
        $this->service->delete($profile);

        return response()->noContent();
    }
}
