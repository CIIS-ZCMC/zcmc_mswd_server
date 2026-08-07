<?php

namespace App\Filament\Resources\UnifiedIntakeSheets\Pages;

use App\DTOs\UnifiedIntakeSheetDto;
use App\Filament\Resources\UnifiedIntakeSheets\UnifiedIntakeSheetResource;
use App\Services\UnifiedIntakeSheetService;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Database\Eloquent\Model;

class CreateUnifiedIntakeSheet extends CreateRecord
{
    protected static string $resource = UnifiedIntakeSheetResource::class;

    /**
     * The wizard captures nested patient/case/assessment data, so hand it to
     * the orchestration service instead of mass-assigning onto the sheet.
     */
    protected function handleRecordCreation(array $data): Model
    {
        return app(UnifiedIntakeSheetService::class)->createDraft(
            UnifiedIntakeSheetDto::fromArray($data),
            auth()->user(),
        );
    }

    protected function getRedirectUrl(): string
    {
        return static::getResource()::getUrl('view', ['record' => $this->record]);
    }
}
