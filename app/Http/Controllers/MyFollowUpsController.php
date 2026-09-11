<?php

namespace App\Http\Controllers;

use App\Http\Resources\CaseProgressNoteResource;
use App\Services\CaseProgressNoteService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * What the actor owes today: their own follow-ups due or overdue, on cases
 * still being worked. Unpaginated by design — a worklist this short is read
 * whole, and one that grows long is itself the signal.
 */
class MyFollowUpsController extends Controller
{
    public function __invoke(Request $request, CaseProgressNoteService $service): AnonymousResourceCollection
    {
        return CaseProgressNoteResource::collection($service->dueFollowUps($request->user()));
    }
}
