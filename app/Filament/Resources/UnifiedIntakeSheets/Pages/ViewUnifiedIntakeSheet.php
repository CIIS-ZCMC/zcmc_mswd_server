<?php

namespace App\Filament\Resources\UnifiedIntakeSheets\Pages;

use App\Filament\Resources\UnifiedIntakeSheets\UnifiedIntakeSheetResource;
use Filament\Resources\Pages\ViewRecord;

class ViewUnifiedIntakeSheet extends ViewRecord
{
    protected static string $resource = UnifiedIntakeSheetResource::class;

    protected function getHeaderActions(): array
    {
        return [
            UnifiedIntakeSheetResource::printAction(),
            UnifiedIntakeSheetResource::finalizeAction(),
            UnifiedIntakeSheetResource::cancelAction(),
        ];
    }
}
