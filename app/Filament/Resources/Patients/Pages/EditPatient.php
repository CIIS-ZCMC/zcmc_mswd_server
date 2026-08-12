<?php

namespace App\Filament\Resources\Patients\Pages;

use App\DTOs\PatientDto;
use App\Filament\Resources\Patients\PatientResource;
use App\Services\PatientService;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Database\Eloquent\Model;

class EditPatient extends EditRecord
{
    protected static string $resource = PatientResource::class;

    protected function handleRecordUpdate(Model $record, array $data): Model
    {
        return app(PatientService::class)->update($record, PatientDto::fromArray($data));
    }

    protected function getHeaderActions(): array
    {
        return [
            PatientResource::mergeAction(),
            PatientResource::archiveAction(),
        ];
    }
}
