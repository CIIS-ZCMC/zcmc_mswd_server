<?php

namespace App\Filament\Resources\FundSources\Pages;

use App\Filament\Resources\FundSources\FundSourceResource;
use Filament\Actions\DeleteAction;
use Filament\Actions\RestoreAction;
use Filament\Resources\Pages\EditRecord;

class EditFundSource extends EditRecord
{
    protected static string $resource = FundSourceResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
            RestoreAction::make(),
        ];
    }
}
