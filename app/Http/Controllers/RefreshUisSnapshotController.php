<?php

namespace App\Http\Controllers;

use App\Http\Resources\AssessmentResource;
use App\Models\Assessment;
use App\Services\AssessmentService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Replaces an intake's frozen UIS copy with the patient's current identity and
 * family composition, recording who asked and when.
 *
 * The intake form collects no family or income — those are filled in on the
 * patient afterwards — so a worker needs a way to pull them onto a sheet that
 * has not been issued yet. Everything else about the copy stays frozen, which is
 * the point of it. See docs/UIS_SNAPSHOT_PLAN.md.
 */
class RefreshUisSnapshotController extends Controller
{
    public function __construct(protected AssessmentService $service) {}

    public function __invoke(Request $request, Assessment $assessment): AssessmentResource
    {
        // A social case study is a signed document, not a UIS.
        abort_if($assessment->isSocialCase(), Response::HTTP_NOT_FOUND);

        // cases.update or intake.update (this is always an intake here).
        abort_unless($assessment->canBeChangedBy($request->user(), 'cases.update'), Response::HTTP_FORBIDDEN);

        $refreshed = $this->service->refreshSnapshot($assessment, $request->user());

        return AssessmentResource::make($refreshed->load(['expenses', 'interviewedBy', 'uisSnapshotBy']));
    }
}
