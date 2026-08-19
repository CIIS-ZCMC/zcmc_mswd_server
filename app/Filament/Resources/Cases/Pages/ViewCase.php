<?php

namespace App\Filament\Resources\Cases\Pages;

use App\Filament\Resources\Cases\CaseResource;
use Filament\Actions\EditAction;
use Filament\Resources\Pages\ViewRecord;

class ViewCase extends ViewRecord
{
    protected static string $resource = CaseResource::class;

    protected function getHeaderActions(): array
    {
        return [
            EditAction::make(),
            CaseResource::assignAction(),
            CaseResource::closeAction(),
            CaseResource::referAction(),
            CaseResource::reopenAction(),
            CaseResource::archiveAction(),
            CaseResource::restoreAction(),
        ];
    }
}
