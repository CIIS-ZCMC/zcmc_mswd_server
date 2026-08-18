<?php

namespace App\Http\Controllers;

use App\DTOs\CaseModelDto;
use App\Http\Requests\StoreCaseModelRequest;
use App\Http\Requests\UpdateCaseModelRequest;
use App\Http\Resources\CaseModelResource;
use App\Models\CaseModel;
use App\Services\CaseModelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class CaseModelController extends Controller implements HasMiddleware
{
    public function __construct(protected CaseModelService $service) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:cases.view', only: ['index', 'show']),
            new Middleware('permission:cases.create', only: ['store']),
            new Middleware('permission:cases.update', only: ['update']),
            new Middleware('permission:cases.delete', only: ['destroy']),
        ];
    }

    public function index(): AnonymousResourceCollection
    {
        return CaseModelResource::collection($this->service->list());
    }

    public function store(StoreCaseModelRequest $request): JsonResponse
    {
        $case = $this->service->create(CaseModelDto::fromArray($request->validated()), $request->user());

        return CaseModelResource::make($case)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(CaseModel $case): CaseModelResource
    {
        return CaseModelResource::make($case->load('patient', 'assignedUser'));
    }

    public function update(UpdateCaseModelRequest $request, CaseModel $case): CaseModelResource
    {
        return CaseModelResource::make(
            $this->service->update($case, CaseModelDto::fromArray($request->validated())),
        );
    }

    public function destroy(CaseModel $case): Response
    {
        $this->service->archive($case);

        return response()->noContent();
    }
}
