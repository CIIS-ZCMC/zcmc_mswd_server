<?php

namespace App\Http\Controllers;

use App\Http\Resources\UnifiedIntakeSheetResource;
use App\Models\UnifiedIntakeSheet;
use App\Services\UnifiedIntakeSheetService;

class SubmitIntakeSheetController extends Controller
{
    public function __construct(protected UnifiedIntakeSheetService $service) {}

    public function __invoke(UnifiedIntakeSheet $intakeSheet): UnifiedIntakeSheetResource
    {
        return UnifiedIntakeSheetResource::make($this->service->submit($intakeSheet));
    }
}
