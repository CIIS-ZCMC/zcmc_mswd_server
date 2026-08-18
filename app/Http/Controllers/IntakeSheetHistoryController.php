<?php

namespace App\Http\Controllers;

use App\Http\Resources\ActivityResource;
use App\Models\UnifiedIntakeSheet;
use App\Services\UnifiedIntakeSheetService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class IntakeSheetHistoryController extends Controller
{
    public function __construct(protected UnifiedIntakeSheetService $service) {}

    public function __invoke(UnifiedIntakeSheet $intakeSheet): AnonymousResourceCollection
    {
        return ActivityResource::collection($this->service->history($intakeSheet));
    }
}
