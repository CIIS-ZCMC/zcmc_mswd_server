<?php

namespace App\Http\Controllers;

use App\Http\Resources\PatientResource;
use App\Services\UnifiedIntakeSheetService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MatchIntakePatientsController extends Controller
{
    public function __construct(protected UnifiedIntakeSheetService $service) {}

    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'last_name' => ['required', 'string'],
            'first_name' => ['required', 'string'],
            'birthdate' => ['nullable', 'date'],
        ]);

        return PatientResource::collection($this->service->matchPatients(
            $validated['last_name'],
            $validated['first_name'],
            $validated['birthdate'] ?? null,
        ));
    }
}
