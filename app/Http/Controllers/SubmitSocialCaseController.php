<?php

namespace App\Http\Controllers;

use App\Http\Resources\SocialCaseResource;
use App\Models\CaseModel;
use App\Services\SocialCaseService;
use Illuminate\Http\Request;

class SubmitSocialCaseController extends Controller
{
    public function __invoke(Request $request, CaseModel $case, SocialCaseService $service): SocialCaseResource
    {
        $scsr = $service->submitForReview($service->find($case), $request->user());

        return SocialCaseResource::make($scsr->load(['expenses', 'createdBy', 'preparedBy', 'notedBy']));
    }
}
