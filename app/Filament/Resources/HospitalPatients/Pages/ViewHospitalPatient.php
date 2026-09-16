<?php

namespace App\Filament\Resources\HospitalPatients\Pages;

use App\Filament\Resources\HospitalPatients\HospitalPatientResource;
use App\Services\HospitalPatientService;
use Filament\Resources\Pages\ViewRecord;
use Illuminate\Database\Eloquent\Model;

class ViewHospitalPatient extends ViewRecord
{
    protected static string $resource = HospitalPatientResource::class;

    /**
     * Read-only surface — no edit action.
     */
    protected function getHeaderActions(): array
    {
        return [];
    }

    /**
     * Resolve the record through the service, not Filament's default route
     * binding. This eager-loads personal data and transactions (+guarantors) in
     * one read, and keeps the page off the raw sqlsrv model binding so it is
     * testable with the repository mocked. The service throws
     * ModelNotFoundException (→ 404) when the id matches no HIS patient.
     */
    protected function resolveRecord(int|string $key): Model
    {
        return app(HospitalPatientService::class)->findWithTransactions($key);
    }
}
