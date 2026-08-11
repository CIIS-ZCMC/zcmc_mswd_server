<?php

namespace App\Filament\Resources\UnifiedIntakeSheets\Pages;

use App\Filament\Resources\UnifiedIntakeSheets\UnifiedIntakeSheetResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListUnifiedIntakeSheets extends ListRecords
{
    protected static string $resource = UnifiedIntakeSheetResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make()->label('New intake'),
        ];
    }
}
