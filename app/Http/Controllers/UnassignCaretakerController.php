<?php

namespace App\Http\Controllers;

use App\DTOs\PatientCaretakerDto;
use App\Http\Resources\PatientCaretakerResource;
use App\Models\PatientCaretaker;
use App\Services\PatientCaretakerService;

class UnassignCaretakerController extends Controller
{
    public function __construct(protected PatientCaretakerService $service) {}

    /**
     * End an assignment: stamp the unassigned date and deactivate it.
     */
    public function __invoke(PatientCaretaker $caretaker): PatientCaretakerResource
    {
        return PatientCaretakerResource::make($this->service->update($caretaker, PatientCaretakerDto::fromArray([
            'unassigned_date' => now()->toDateTimeString(),
            'is_active' => false,
        ])));
    }
}
