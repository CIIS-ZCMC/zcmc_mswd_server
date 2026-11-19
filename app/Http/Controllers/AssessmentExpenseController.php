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
use Illuminate\Http\Request;
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
            // store and update are authorized in their requests, destroy below:
            // the cases permission, or intake.update for an intake's lines.
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

    public function destroy(Request $request, AssessmentExpense $expense): Response
    {
        abort_unless($expense->assessment->canBeChangedBy($request->user(), 'cases.update'), Response::HTTP_FORBIDDEN);

        $this->service->delete($expense);

        return response()->noContent();
    }
}
