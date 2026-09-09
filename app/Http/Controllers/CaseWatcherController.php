<?php

namespace App\Http\Controllers;

use App\DTOs\CaseWatcherDto;
use App\Http\Requests\StoreCaseWatcherRequest;
use App\Http\Requests\UpdateCaseWatcherRequest;
use App\Http\Resources\CaseWatcherResource;
use App\Models\CaseModel;
use App\Models\CaseWatcher;
use App\Services\CaseWatcherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class CaseWatcherController extends Controller
{
    public function __construct(protected CaseWatcherService $service) {}

    public function index(CaseModel $case): AnonymousResourceCollection
    {
        return CaseWatcherResource::collection($case->watchers()->with('addedBy')->latest()->get());
    }

    public function store(StoreCaseWatcherRequest $request, CaseModel $case): JsonResponse
    {
        $dto = CaseWatcherDto::fromArray(array_merge($request->validated(), [
            'case_id' => $case->id,
            'added_by' => $request->user()->id,
        ]));

        $watcher = $this->service->create($dto->toArray());

        return CaseWatcherResource::make($watcher)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateCaseWatcherRequest $request, CaseWatcher $caseWatcher): CaseWatcherResource
    {
        $dto = CaseWatcherDto::fromArray($request->validated());

        return CaseWatcherResource::make($this->service->update($caseWatcher, $dto->toArray()));
    }

    public function destroy(CaseWatcher $caseWatcher): Response
    {
        $this->service->remove($caseWatcher);

        return response()->noContent();
    }
}
