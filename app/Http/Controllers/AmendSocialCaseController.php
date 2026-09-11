<?php

namespace App\Http\Controllers;

use App\Http\Requests\AmendSocialCaseRequest;
use App\Http\Resources\SocialCaseResource;
use App\Models\CaseModel;
use App\Services\SocialCaseService;

class AmendSocialCaseController extends Controller
{
    public function __invoke(AmendSocialCaseRequest $request, CaseModel $case, SocialCaseService $service): SocialCaseResource
    {
        $scsr = $service->amend($service->find($case), $request->user(), $request->validated()['reason']);

        return SocialCaseResource::make($scsr->load(['expenses', 'createdBy', 'preparedBy', 'notedBy']));
    }
}
