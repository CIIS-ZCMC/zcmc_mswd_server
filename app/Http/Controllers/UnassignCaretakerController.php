<?php

namespace App\Http\Controllers;

use App\Http\Resources\PatientCaretakerResource;
use App\Models\PatientCaretaker;
use App\Services\PatientCaretakerService;
use Illuminate\Http\Request;

class UnassignCaretakerController extends Controller
{
    public function __construct(protected PatientCaretakerService $service) {}

    /**
     * End an assignment: stamp the unassigned date and deactivate it.
     */
    public function __invoke(Request $request, PatientCaretaker $caretaker): PatientCaretakerResource
    {
        $validated = $request->validate([
            'unassigned_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $caretaker = $this->service->unassign(
            $caretaker,
            $request->user(),
            $validated['unassigned_reason'] ?? null,
        );

        return PatientCaretakerResource::make($caretaker->load(['assignedBy', 'unassignedBy']));
    }
}
