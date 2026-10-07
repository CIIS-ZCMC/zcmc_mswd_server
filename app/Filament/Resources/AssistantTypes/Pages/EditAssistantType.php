<?php

namespace App\Filament\Resources\AssistantTypes\Pages;

use App\Filament\Resources\AssistantTypes\AssistantTypeResource;
use Filament\Actions\DeleteAction;
use Filament\Actions\RestoreAction;
use Filament\Resources\Pages\EditRecord;

class EditAssistantType extends EditRecord
{
    protected static string $resource = AssistantTypeResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
            RestoreAction::make(),
        ];
    }
}
