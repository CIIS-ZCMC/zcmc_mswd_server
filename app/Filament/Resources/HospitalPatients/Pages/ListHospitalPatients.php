<?php

namespace App\Filament\Resources\HospitalPatients\Pages;

use App\Filament\Resources\HospitalPatients\HospitalPatientResource;
use Filament\Resources\Pages\ListRecords;

class ListHospitalPatients extends ListRecords
{
    protected static string $resource = HospitalPatientResource::class;

    /**
     * Read-only surface — no create action.
     */
    protected function getHeaderActions(): array
    {
        return [];
    }
}
