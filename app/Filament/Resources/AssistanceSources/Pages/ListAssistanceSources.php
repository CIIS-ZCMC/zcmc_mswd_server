<?php

namespace App\Filament\Resources\AssistanceSources\Pages;

use App\Filament\Resources\AssistanceSources\AssistanceSourceResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListAssistanceSources extends ListRecords
{
    protected static string $resource = AssistanceSourceResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
