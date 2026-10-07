<?php

namespace App\Filament\Resources\AssistantTypes\Pages;

use App\Filament\Resources\AssistantTypes\AssistantTypeResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListAssistantTypes extends ListRecords
{
    protected static string $resource = AssistantTypeResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
