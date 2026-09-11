<?php

namespace App\Http\Controllers;

use App\DTOs\AssessmentExpenseDto;
use App\Http\Requests\StoreAssessmentExpenseRequest;
use App\Http\Requests\UpdateAssessmentExpenseRequest;
use App\Http\Resources\AssessmentExpenseResource;
use App\Models\Assessment;
use App\Models\AssessmentExpense;
use App\Services\AssessmentExpenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class AssessmentExpenseController extends Controller implements HasMiddleware
{
    public function __construct(protected AssessmentExpenseService $service) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:cases.view', only: ['index']),
            new Middleware('permission:cases.create', only: ['store']),
            new Middleware('permission:cases.update', only: ['update', 'destroy']),
        ];
    }

    public function index(Assessment $assessment): AnonymousResourceCollection
    {
        return AssessmentExpenseResource::collection($assessment->expenses()->latest('id')->get());
    }

    public function store(StoreAssessmentExpenseRequest $request, Assessment $assessment): JsonResponse
    {
        $expense = $this->service->create($assessment, AssessmentExpenseDto::fromArray($request->validated()));

        return AssessmentExpenseResource::make($expense)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateAssessmentExpenseRequest $request, AssessmentExpense $expense): AssessmentExpenseResource
    {
        return AssessmentExpenseResource::make(
            $this->service->update($expense, AssessmentExpenseDto::fromArray($request->validated())),
        );
    }

    public function destroy(AssessmentExpense $expense): Response
    {
        $this->service->delete($expense);

        return response()->noContent();
    }
}
