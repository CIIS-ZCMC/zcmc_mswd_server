<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreServiceVisitRequest;
use App\Http\Resources\ServiceVisitResource;
use App\Models\Patient;
use App\Models\ServiceVisit;
use App\Services\ServiceVisitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Carbon;

/**
 * Turnaround timing of MSWD visits: time in, start, complete or cancel a
 * patient's visit for a HIS encounter, and read the day's queue.
 */
class ServiceVisitController extends Controller implements HasMiddleware
{
    public function __construct(protected ServiceVisitService $visits) {}

    public static function middleware(): array
    {
        return [new Middleware('permission:queue.manage')];
    }

    /** The queue board for a day (`?date=`, default today). */
    public function queue(Request $request): JsonResponse
    {
        $validated = $request->validate(['date' => ['sometimes', 'date_format:Y-m-d']]);
        $date = Carbon::parse($validated['date'] ?? today()->toDateString());

        $queue = $this->visits->queue($date);

        return response()->json([
            'date' => $date->toDateString(),
            'waiting' => ServiceVisitResource::collection($queue['waiting'])->resolve($request),
            'in_progress' => ServiceVisitResource::collection($queue['in_progress'])->resolve($request),
            'completed' => ServiceVisitResource::collection($queue['completed'])->resolve($request),
            'summary' => [
                'waiting' => $queue['waiting']->count(),
                'in_progress' => $queue['in_progress']->count(),
                'completed' => $queue['completed']->count(),
            ],
        ]);
    }

    /** A patient's visits, newest first; `?his_transaction_id=` narrows to one encounter. */
    public function index(Request $request, Patient $patient): JsonResponse
    {
        $validated = $request->validate(['his_transaction_id' => ['sometimes', 'integer', 'min:1']]);

        $visits = $this->visits->forPatient($patient, isset($validated['his_transaction_id']) ? (int) $validated['his_transaction_id'] : null);

        return response()->json(['data' => ServiceVisitResource::collection($visits)->resolve($request)]);
    }

    public function store(StoreServiceVisitRequest $request, Patient $patient): JsonResponse
    {
        $visit = $this->visits->timeIn(
            $patient,
            (int) $request->validated('his_transaction_id'),
            $request->user(),
            $request->safe()->only(['purpose', 'remarks']),
        );

        return ServiceVisitResource::make($visit)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function start(Request $request, ServiceVisit $visit): ServiceVisitResource
    {
        return ServiceVisitResource::make($this->visits->start($visit, $request->user()));
    }

    public function complete(Request $request, ServiceVisit $visit): ServiceVisitResource
    {
        $validated = $request->validate(['remarks' => ['nullable', 'string', 'max:500']]);

        return ServiceVisitResource::make($this->visits->complete($visit, $request->user(), $validated['remarks'] ?? null));
    }

    public function cancel(Request $request, ServiceVisit $visit): ServiceVisitResource
    {
        $validated = $request->validate(['cancel_reason' => ['required', 'string', 'max:255']]);

        return ServiceVisitResource::make($this->visits->cancel($visit, $request->user(), $validated['cancel_reason']));
    }
}
