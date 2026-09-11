<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReassignCaretakerRequest;
use App\Http\Resources\PatientCaretakerResource;
use App\Models\PatientCaretaker;
use App\Services\PatientCaretakerService;
use Illuminate\Validation\ValidationException;

class ReassignCaretakerController extends Controller
{
    public function __construct(protected PatientCaretakerService $service) {}

    /**
     * Hand a caretaker role over to another user in one step.
     *
     * Distinct from unassign-then-assign: the two rows are linked, the reason is
     * recorded on both sides of the handover, and the patient is never left
     * without a caretaker in between.
     */
    public function __invoke(
        ReassignCaretakerRequest $request,
        PatientCaretaker $caretaker,
    ): PatientCaretakerResource {
        if (! $caretaker->is_active) {
            throw ValidationException::withMessages([
                'caretaker' => 'This assignment has already ended and cannot be reassigned.',
            ]);
        }

        $replacement = $this->service->reassign(
            $caretaker,
            (int) $request->validated('user_id'),
            $request->user(),
            $request->validated('reason'),
        );

        return PatientCaretakerResource::make(
            $replacement->load(['assignedBy', 'unassignedBy']),
        );
    }
}
