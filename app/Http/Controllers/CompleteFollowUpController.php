<?php

namespace App\Http\Controllers;

use App\Http\Resources\CaseProgressNoteResource;
use App\Models\CaseProgressNote;
use App\Services\CaseProgressNoteService;
use Illuminate\Http\Request;

class CompleteFollowUpController extends Controller
{
    public function __invoke(Request $request, CaseProgressNote $progressNote, CaseProgressNoteService $service): CaseProgressNoteResource
    {
        return CaseProgressNoteResource::make($service->completeFollowUp($progressNote, $request->user()));
    }
}
