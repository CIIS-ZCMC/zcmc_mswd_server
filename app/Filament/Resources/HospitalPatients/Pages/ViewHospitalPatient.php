<?php

namespace App\Filament\Resources\HospitalPatients\Pages;

use App\Filament\Resources\HospitalPatients\HospitalPatientResource;
use App\Models\Bizbox\HospitalPatient;
use App\Models\Sector;
use App\Services\HospitalPatientService;
use App\Services\PatientService;
use Filament\Actions\Action;
use Filament\Forms\Components\Select;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ViewRecord;
use Filament\Support\Icons\Heroicon;
use Illuminate\Database\Eloquent\Model;

class ViewHospitalPatient extends ViewRecord
{
    protected static string $resource = HospitalPatientResource::class;

    protected function getHeaderActions(): array
    {
        return [
            $this->importAction(),
        ];
    }

    /**
     * Copy this HIS patient into the local patients table (create the first
     * time, refresh on repeat — keyed on hospital_id). Gated on patients.create.
     */
    protected function importAction(): Action
    {
        return Action::make('import')
            ->label('Import to local patients')
            ->icon(Heroicon::OutlinedArrowDownTray)
            ->visible(fn (): bool => auth()->user()?->can('patients.create') ?? false)
            ->schema([
                Select::make('sector_id')
                    ->label('Sector')
                    ->helperText('Optional — the HIS record carries none.')
                    ->options(fn () => Sector::orderBy('name')->pluck('name', 'id')),
            ])
            ->action(function (HospitalPatient $record, array $data): void {
                $patient = app(PatientService::class)
                    ->storeFromHospitalPatient($record, $data['sector_id'] ?? null);

                Notification::make()
                    ->title($patient->wasRecentlyCreated ? 'Patient imported' : 'Patient updated from HIS')
                    ->body("{$patient->last_name}, {$patient->first_name} (MSWD {$patient->mswd_id})")
                    ->success()
                    ->send();
            });
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
