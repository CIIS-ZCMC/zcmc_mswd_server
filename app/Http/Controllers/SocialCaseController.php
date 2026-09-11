<?php

namespace App\Http\Controllers;

use App\DTOs\SocialCaseDto;
use App\Http\Requests\StoreSocialCaseRequest;
use App\Http\Requests\UpdateSocialCaseRequest;
use App\Http\Resources\SocialCaseResource;
use App\Models\CaseModel;
use App\Services\SocialCaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * One social case study per case episode, so the URL is singular and case-scoped:
 * /cases/{case}/social-case, never /social-cases/{id}.
 */
class SocialCaseController extends Controller implements HasMiddleware
{
    private const RELATIONS = ['expenses', 'createdBy', 'preparedBy', 'notedBy', 'latestSocialCaseDocument'];

    public function __construct(protected SocialCaseService $service) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:cases.view', only: ['show']),
            new Middleware('permission:cases.create', only: ['store']),
            new Middleware('permission:cases.update', only: ['update']),
        ];
    }

    public function show(CaseModel $case): SocialCaseResource
    {
        return SocialCaseResource::make($this->service->find($case)->load(self::RELATIONS));
    }

    public function store(StoreSocialCaseRequest $request, CaseModel $case): JsonResponse
    {
        $validated = $request->validated();

        $scsr = $this->service->start(
            $case,
            $request->user(),
            SocialCaseDto::fromArray(collect($validated)->except('assessment_id')->all()),
            $validated['assessment_id'] ?? null,
        );

        return SocialCaseResource::make($scsr->load(self::RELATIONS))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateSocialCaseRequest $request, CaseModel $case): SocialCaseResource
    {
        $scsr = $this->service->update(
            $this->service->find($case),
            SocialCaseDto::fromArray($request->validated()),
        );

        return SocialCaseResource::make($scsr->load(self::RELATIONS));
    }
}
