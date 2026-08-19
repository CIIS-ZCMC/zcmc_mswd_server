<?php

namespace App\Filament\Resources\Cases\Pages;

use App\DTOs\CaseModelDto;
use App\Filament\Resources\Cases\CaseResource;
use App\Services\CaseModelService;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Database\Eloquent\Model;

class EditCase extends EditRecord
{
    protected static string $resource = CaseResource::class;

    protected function handleRecordUpdate(Model $record, array $data): Model
    {
        return app(CaseModelService::class)->update($record, CaseModelDto::fromArray($data));
    }

    protected function getHeaderActions(): array
    {
        return [
            CaseResource::assignAction(),
            CaseResource::closeAction(),
            CaseResource::archiveAction(),
        ];
    }
}
