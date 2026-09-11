<?php

namespace App\Http\Controllers;

use App\DTOs\CaseProgressNoteDto;
use App\Http\Requests\StoreCaseProgressNoteRequest;
use App\Http\Requests\UpdateCaseProgressNoteRequest;
use App\Http\Resources\CaseProgressNoteResource;
use App\Models\CaseModel;
use App\Models\CaseProgressNote;
use App\Services\CaseProgressNoteService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class CaseProgressNoteController extends Controller implements HasMiddleware
{
    public function __construct(protected CaseProgressNoteService $service) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:cases.view', only: ['index']),
            new Middleware('permission:cases.update', only: ['store', 'update', 'destroy']),
        ];
    }

    public function index(Request $request, CaseModel $case): AnonymousResourceCollection
    {
        return CaseProgressNoteResource::collection(
            $this->service->listForCase($case, ListQuery::fromRequest($request)),
        );
    }

    public function store(StoreCaseProgressNoteRequest $request, CaseModel $case): JsonResponse
    {
        $note = $this->service->create($case, $request->user(), CaseProgressNoteDto::fromArray($request->validated()));

        return CaseProgressNoteResource::make($note)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateCaseProgressNoteRequest $request, CaseProgressNote $progressNote): CaseProgressNoteResource
    {
        return CaseProgressNoteResource::make($this->service->update(
            $progressNote,
            $request->user(),
            CaseProgressNoteDto::fromArray($request->validated()),
        ));
    }

    public function destroy(Request $request, CaseProgressNote $progressNote): Response
    {
        $this->service->delete($progressNote, $request->user());

        return response()->noContent();
    }
}
