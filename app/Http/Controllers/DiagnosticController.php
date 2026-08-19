<?php

namespace App\Http\Controllers;

use App\DTOs\DiagnosticDto;
use App\Http\Requests\StoreDiagnosticRequest;
use App\Http\Requests\UpdateDiagnosticRequest;
use App\Http\Resources\DiagnosticResource;
use App\Models\CaseModel;
use App\Models\Diagnostic;
use App\Services\CaseModelService;
use App\Services\DiagnosticService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class DiagnosticController extends Controller implements HasMiddleware
{
    public function __construct(protected DiagnosticService $service) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:cases.view', only: ['index']),
            new Middleware('permission:cases.create', only: ['store']),
            new Middleware('permission:cases.update', only: ['update', 'destroy']),
        ];
    }

    public function index(CaseModel $case): AnonymousResourceCollection
    {
        return DiagnosticResource::collection($case->diagnostics()->latest()->get());
    }

    public function store(StoreDiagnosticRequest $request, CaseModel $case, CaseModelService $cases): JsonResponse
    {
        $diagnostic = $this->service->create(DiagnosticDto::fromArray(array_merge($request->validated(), [
            'case_id' => $case->id,
            'created_by' => $request->user()->id,
            'diagnosis_date' => $request->validated('diagnosis_date') ?? now()->toDateTimeString(),
        ])));

        $cases->logMilestone($case, $request->user(), 'diagnosis_added', $diagnostic->diagnosis_name);

        return DiagnosticResource::make($diagnostic)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateDiagnosticRequest $request, Diagnostic $diagnostic): DiagnosticResource
    {
        return DiagnosticResource::make(
            $this->service->update($diagnostic, DiagnosticDto::fromArray($request->validated())),
        );
    }

    public function destroy(Diagnostic $diagnostic): Response
    {
        $this->service->delete($diagnostic);

        return response()->noContent();
    }
}
