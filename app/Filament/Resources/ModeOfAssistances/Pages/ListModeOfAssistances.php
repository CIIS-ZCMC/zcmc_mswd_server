<?php

namespace App\Filament\Resources\ModeOfAssistances\Pages;

use App\Filament\Resources\ModeOfAssistances\ModeOfAssistanceResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListModeOfAssistances extends ListRecords
{
    protected static string $resource = ModeOfAssistanceResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
