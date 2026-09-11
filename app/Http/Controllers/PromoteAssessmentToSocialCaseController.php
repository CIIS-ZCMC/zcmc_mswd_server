<?php

namespace App\Http\Controllers;

use App\Http\Resources\AssessmentResource;
use App\Models\Assessment;
use App\Services\AssessmentService;
use Illuminate\Http\Request;

class PromoteAssessmentToSocialCaseController extends Controller
{
    public function __construct(protected AssessmentService $service) {}

    public function __invoke(Request $request, Assessment $assessment): AssessmentResource
    {
        if (! $request->user()?->can('cases.update')) {
            abort(403, 'This action is unauthorized.');
        }

        $promoted = $this->service->promoteToSocialCase($assessment, $request->user()->id);

        return AssessmentResource::make($promoted);
    }
}

