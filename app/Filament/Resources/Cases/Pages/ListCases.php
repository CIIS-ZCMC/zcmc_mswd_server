<?php

namespace App\Filament\Resources\Cases\Pages;

use App\Filament\Resources\Cases\CaseResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListCases extends ListRecords
{
    protected static string $resource = CaseResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make()->label('New case'),
        ];
    }
}
