<?php

namespace App\Filament\Resources\HospitalPatients;

use App\Filament\Resources\HospitalPatients\Pages\ListHospitalPatients;
use App\Filament\Resources\HospitalPatients\Pages\ViewHospitalPatient;
use App\Models\Bizbox\HospitalPatient;
use App\Services\HospitalPatientService;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Infolists\Components\RepeatableEntry;
use Filament\Infolists\Components\TextEntry;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\QueryException;

/**
 * Read-only browse surface over the hospital system (HIS) patient master
 * (emdPatients). Lists patients and, per patient, shows their personal data
 * (psPersonaldata) and transactions (psPatRegisters, with guarantors).
 *
 * The HIS is external and this app never writes to it, so the resource has no
 * form and no create/edit/delete. Reads route through the services — never
 * Filament's default Eloquent query — so an unreachable HIS renders an empty
 * table rather than a 500 (the SQL Server is down on every dev machine).
 */
class HospitalPatientResource extends Resource
{
    protected static ?string $model = HospitalPatient::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedBuildingOffice2;

    protected static string|null|\UnitEnum $navigationGroup = 'Patients';

    protected static ?string $navigationLabel = 'Hospital Patients (HIS)';

    protected static ?string $modelLabel = 'hospital patient';

    protected static ?string $recordTitleAttribute = 'patid';

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Patient')->columns(2)->schema([
                TextEntry::make('hospital_number')
                    ->label('Hospital number')
                    ->state(fn (HospitalPatient $record) => $record->hospital_number)
                    ->placeholder('—'),
                TextEntry::make('display_name')
                    ->label('Name')
                    ->state(fn (HospitalPatient $record) => $record->displayName()),
            ]),
            Section::make('Personal data')->columns(2)->schema([
                TextEntry::make('first_name')
                    ->label('First name')
                    ->state(fn (HospitalPatient $record) => $record->personalData?->firstname)
                    ->placeholder('—'),
                TextEntry::make('middle_name')
                    ->label('Middle name')
                    ->state(fn (HospitalPatient $record) => $record->personalData?->middlename)
                    ->placeholder('—'),
                TextEntry::make('last_name')
                    ->label('Last name')
                    ->state(fn (HospitalPatient $record) => $record->personalData?->lastname)
                    ->placeholder('—'),
                TextEntry::make('extension_name')
                    ->label('Suffix')
                    ->state(fn (HospitalPatient $record) => $record->personalData?->suffixname)
                    ->placeholder('—'),
                TextEntry::make('sex')
                    ->label('Sex')
                    ->state(fn (HospitalPatient $record) => $record->toPatientAttributes()['sex'] ?? null)
                    ->placeholder('—'),
                TextEntry::make('birthdate')
                    ->label('Birthdate')
                    ->state(fn (HospitalPatient $record) => $record->toPatientAttributes()['birthdate'] ?? null)
                    ->placeholder('—'),
                TextEntry::make('civil_status')
                    ->label('Civil status')
                    ->state(fn (HospitalPatient $record) => $record->toPatientAttributes()['civil_status'] ?? null)
                    ->placeholder('—'),
            ]),
            Section::make('Transactions')
                ->description('Encounters recorded in the hospital system (HIS), newest first.')
                ->schema([
                    RepeatableEntry::make('transactions')
                        ->hiddenLabel()
                        ->state(fn (HospitalPatient $record) => static::transactionsFor($record))
                        ->placeholder('No transactions found in the hospital system.')
                        ->columns(3)
                        ->schema([
                            TextEntry::make('transaction_no')->label('Transaction no.'),
                            TextEntry::make('registered_at')->label('Registered')->dateTime()->placeholder('—'),
                            TextEntry::make('guarantors')->label('Guarantors')->placeholder('None on file'),
                        ]),
                ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            // Custom data source: the rows come from the resilient service, not
            // a live sqlsrv query, so the list survives an unreachable HIS and
            // is testable by mocking the repository.
            ->records(fn (int $page, int $recordsPerPage, ?string $search): LengthAwarePaginator => app(HospitalPatientService::class)
                ->paginateForPanel($search, $recordsPerPage, $page))
            ->columns([
                TextColumn::make('hospital_number')
                    ->label('Hospital number')
                    ->state(fn (HospitalPatient $record) => $record->hospital_number),
                TextColumn::make('name')
                    ->label('Name')
                    ->state(fn (HospitalPatient $record) => $record->displayName())
                    ->searchable(),
                TextColumn::make('sex')
                    ->label('Sex')
                    ->state(fn (HospitalPatient $record) => $record->toPatientAttributes()['sex'] ?? null)
                    ->placeholder('—'),
                TextColumn::make('birthdate')
                    ->label('Birthdate')
                    ->state(fn (HospitalPatient $record) => $record->toPatientAttributes()['birthdate'] ?? null)
                    ->placeholder('—'),
            ])
            ->recordActions([
                Action::make('view')
                    ->icon(Heroicon::OutlinedEye)
                    ->url(fn (HospitalPatient $record) => static::getUrl('view', ['record' => $record->getKey()])),
            ]);
    }

    /**
     * The transactions repeater rows for one HIS patient. Reads the relation
     * eager-loaded by the view page's resolveRecord() (personal data +
     * transactions.guarantors.account.personalData in one read), so there is no
     * second HIS round-trip. Wrapped defensively so a lazy-load against a down
     * HIS degrades to no rows rather than a 500. Mirrors the mapping proven on
     * the local patient's "Hospital visits" section.
     *
     * @return array<int, array<string, mixed>>
     */
    protected static function transactionsFor(HospitalPatient $record): array
    {
        try {
            return $record->transactions
                ->map(fn ($transaction) => [
                    'transaction_no' => $transaction->getKey(),
                    'registered_at' => $transaction->registrydate,
                    'guarantors' => $transaction->guarantors
                        ->map(fn ($guarantor) => $guarantor->account?->displayName())
                        ->filter()
                        ->join(', '),
                ])
                ->all();
        } catch (QueryException $e) {
            report($e);

            return [];
        }
    }

    public static function getPages(): array
    {
        return [
            'index' => ListHospitalPatients::route('/'),
            'view' => ViewHospitalPatient::route('/{record}'),
        ];
    }

    public static function canViewAny(): bool
    {
        return auth()->user()?->can('hospital-patients.view') ?? false;
    }

    public static function canView($record): bool
    {
        return auth()->user()?->can('hospital-patients.view') ?? false;
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit($record): bool
    {
        return false;
    }

    public static function canDelete($record): bool
    {
        return false;
    }

    public static function canDeleteAny(): bool
    {
        return false;
    }
}
