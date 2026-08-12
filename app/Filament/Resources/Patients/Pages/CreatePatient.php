<?php

namespace App\Filament\Resources\Patients\Pages;

use App\DTOs\PatientDto;
use App\Filament\Resources\Patients\PatientResource;
use App\Services\PatientService;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Database\Eloquent\Model;

class CreatePatient extends CreateRecord
{
    protected static string $resource = PatientResource::class;

    /**
     * Route creation through the service so the MSWD ID is generated.
     */
    protected function handleRecordCreation(array $data): Model
    {
        return app(PatientService::class)->create(PatientDto::fromArray($data));
    }
}
