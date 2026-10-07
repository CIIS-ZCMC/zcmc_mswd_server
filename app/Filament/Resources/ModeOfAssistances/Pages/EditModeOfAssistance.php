<?php

namespace App\Filament\Resources\ModeOfAssistances\Pages;

use App\Filament\Resources\ModeOfAssistances\ModeOfAssistanceResource;
use Filament\Actions\DeleteAction;
use Filament\Actions\RestoreAction;
use Filament\Resources\Pages\EditRecord;

class EditModeOfAssistance extends EditRecord
{
    protected static string $resource = ModeOfAssistanceResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
            RestoreAction::make(),
        ];
    }
}
