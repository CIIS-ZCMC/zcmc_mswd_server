<?php

namespace App\Http\Controllers;

use App\Http\Resources\UnifiedIntakeSheetResource;
use App\Models\UnifiedIntakeSheet;
use App\Services\UnifiedIntakeSheetService;
use Illuminate\Http\Request;

class FinalizeIntakeSheetController extends Controller
{
    public function __construct(protected UnifiedIntakeSheetService $service) {}

    public function __invoke(Request $request, UnifiedIntakeSheet $intakeSheet): UnifiedIntakeSheetResource
    {
        return UnifiedIntakeSheetResource::make($this->service->finalize($intakeSheet, $request->user()));
    }
}
