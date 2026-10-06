<?php

namespace App\Filament\Resources\AssistanceSources\Pages;

use App\Filament\Resources\AssistanceSources\AssistanceSourceResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditAssistanceSource extends EditRecord
{
    protected static string $resource = AssistanceSourceResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
