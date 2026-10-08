<?php

namespace App\Filament\Resources\Signatories\Pages;

use App\Filament\Resources\Signatories\SignatoryResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListSignatories extends ListRecords
{
    protected static string $resource = SignatoryResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
