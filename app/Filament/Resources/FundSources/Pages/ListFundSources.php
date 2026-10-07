<?php

namespace App\Filament\Resources\FundSources\Pages;

use App\Filament\Resources\FundSources\FundSourceResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListFundSources extends ListRecords
{
    protected static string $resource = FundSourceResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
