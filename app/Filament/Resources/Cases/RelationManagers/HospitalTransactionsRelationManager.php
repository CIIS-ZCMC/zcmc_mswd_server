<?php

namespace App\Filament\Resources\Cases\RelationManagers;

use App\Models\Bizbox\PatientTransaction;
use App\Models\CaseHospitalTransaction;
use App\Services\CaseHospitalTransactionService;
use App\Services\PatientTransactionService;
use Filament\Actions\Action;
use Filament\Forms\Components\Select;
use Filament\Notifications\Notification;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Validation\ValidationException;

/**
 * Hospital (HIS) encounters attached to this case. Each row is a stored link +
 * a curated snapshot frozen at attach time; the encounter itself stays read-live
 * on the HIS. Diagnosis is viewed/edited through the Diagnostics manager — the
 * snapshot's HIS diagnosis is reference only.
 */
class HospitalTransactionsRelationManager extends RelationManager
{
    protected static string $relationship = 'hospitalTransactions';

    protected static ?string $title = 'Hospital encounters';

    public function isReadOnly(): bool
    {
        return false;
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('his_transaction_id')->label('Encounter no.'),
                TextColumn::make('snapshot.registration_status.label')->label('Status')->placeholder('—'),
                TextColumn::make('snapshot.service_type.description')->label('Service type')->placeholder('—'),
                TextColumn::make('snapshot.guarantor_total')->label('Guarantor total')->placeholder('—'),
                TextColumn::make('linked_at')->label('Attached')->dateTime()->placeholder('—'),
            ])
            ->headerActions([
                $this->attachEncounterAction(),
            ])
            ->recordActions([
                $this->detachEncounterAction(),
            ]);
    }

    protected function attachEncounterAction(): Action
    {
        return Action::make('attachEncounter')
            ->label('Attach hospital encounter')
            ->icon(Heroicon::OutlinedLink)
            ->visible(fn (): bool => auth()->user()?->can('cases.update') ?? false)
            ->schema([
                Select::make('his_transaction_id')
                    ->label('Hospital encounter')
                    ->required()
                    ->searchable()
                    ->getSearchResultsUsing(fn (string $search) => app(PatientTransactionService::class)
                        ->forHospitalNumber($this->getOwnerRecord()->patient?->hospital_id)
                        ->filter(fn (PatientTransaction $t) => $search === ''
                            || str_contains((string) $t->getKey(), $search)
                            || str_contains((string) $t->registrydate, $search))
                        ->mapWithKeys(fn (PatientTransaction $t) => [
                            $t->getKey() => "#{$t->getKey()} — ".($t->registrydate ?? 'no date'),
                        ])
                        ->all())
                    ->getOptionLabelUsing(fn ($value) => "#{$value}"),
            ])
            ->action(function (array $data): void {
                try {
                    app(CaseHospitalTransactionService::class)->attach(
                        $this->getOwnerRecord(),
                        $data['his_transaction_id'],
                        auth()->user(),
                    );

                    Notification::make()->title('Hospital encounter attached')->success()->send();
                } catch (ValidationException $e) {
                    Notification::make()
                        ->title('Could not attach encounter')
                        ->body($e->validator->errors()->first())
                        ->danger()
                        ->send();
                }
            });
    }

    protected function detachEncounterAction(): Action
    {
        return Action::make('detachEncounter')
            ->label('Detach')
            ->icon(Heroicon::OutlinedXMark)
            ->color('danger')
            ->requiresConfirmation()
            ->visible(fn (): bool => auth()->user()?->can('cases.update') ?? false)
            ->action(function (CaseHospitalTransaction $record): void {
                app(CaseHospitalTransactionService::class)->detach($record, auth()->user());

                Notification::make()->title('Hospital encounter detached')->success()->send();
            });
    }
}
