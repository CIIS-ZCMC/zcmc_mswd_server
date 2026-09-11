<?php

namespace App\Http\Controllers;

use App\Http\Resources\ActivityResource;
use App\Http\Resources\PatientCaretakerResource;
use App\Models\Patient;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientCaretakeController extends Controller
{
    /**
     * How much recent activity the Caretake tab shows before the user has to
     * open the full trail.
     */
    private const RECENT_ACTIVITY_LIMIT = 20;

    public function __construct(protected ActivityLogService $activityLog) {}

    /**
     * Custody and accountability in one request — the two halves the Caretake
     * tab renders together, so the client does not have to stitch three
     * endpoints to draw one screen.
     */
    public function __invoke(Request $request, Patient $patient): JsonResponse
    {
        $caretakers = $patient->caretakers()
            ->with(['user', 'assignedBy', 'unassignedBy'])
            ->latest('assigned_date')
            ->get();

        $recentActivity = $this->activityLog->collect(
            ['patient_id' => $patient->id],
            $request->user(),
            self::RECENT_ACTIVITY_LIMIT,
        );

        return response()->json([
            'data' => [
                'caretakers' => [
                    // Split server-side: "who is responsible right now" and
                    // "who has been" are two different questions the tab asks,
                    // and the client should not re-derive the split from a flag.
                    'active' => PatientCaretakerResource::collection(
                        $caretakers->where('is_active', true)->values(),
                    ),
                    'history' => PatientCaretakerResource::collection(
                        $caretakers->where('is_active', false)->values(),
                    ),
                ],
                'recent_activity' => ActivityResource::collection($recentActivity),
            ],
        ]);
    }
}
