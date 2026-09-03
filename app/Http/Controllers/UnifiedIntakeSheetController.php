<?php

namespace App\Http\Controllers;

use App\DTOs\UnifiedIntakeSheetDto;
use App\Http\Requests\StoreUnifiedIntakeSheetRequest;
use App\Http\Requests\UpdateUnifiedIntakeSheetRequest;
use App\Http\Resources\UnifiedIntakeSheetResource;
use App\Models\UnifiedIntakeSheet;
use App\Services\UnifiedIntakeSheetService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class UnifiedIntakeSheetController extends Controller implements HasMiddleware
{
    public function __construct(protected UnifiedIntakeSheetService $service) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:intake.view', only: ['index', 'show']),
            new Middleware('permission:intake.create', only: ['store']),
            new Middleware('permission:intake.update', only: ['update']),
            new Middleware('permission:intake.delete', only: ['destroy']),
        ];
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return UnifiedIntakeSheetResource::collection($this->service->list(ListQuery::fromRequest($request)));
    }

    public function store(StoreUnifiedIntakeSheetRequest $request): JsonResponse
    {
        $sheet = $this->service->createDraft(
            UnifiedIntakeSheetDto::fromArray($request->validated()),
            $request->user(),
        );

        return UnifiedIntakeSheetResource::make($sheet)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(UnifiedIntakeSheet $intakeSheet): UnifiedIntakeSheetResource
    {
        return UnifiedIntakeSheetResource::make(
            $intakeSheet->load('patient', 'case', 'assessment.expenses', 'intakeWorker'),
        );
    }

    public function update(UpdateUnifiedIntakeSheetRequest $request, UnifiedIntakeSheet $intakeSheet): UnifiedIntakeSheetResource
    {
        $sheet = $this->service->update($intakeSheet, UnifiedIntakeSheetDto::fromArray($request->validated()));

        return UnifiedIntakeSheetResource::make($sheet);
    }

    public function destroy(UnifiedIntakeSheet $intakeSheet): Response
    {
        $this->service->cancel($intakeSheet);

        return response()->noContent();
    }
}
