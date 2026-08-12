<?php

namespace App\Filament\Resources\Patients;

use App\Filament\Resources\Patients\Pages\CreatePatient;
use App\Filament\Resources\Patients\Pages\EditPatient;
use App\Filament\Resources\Patients\Pages\ListPatients;
use App\Filament\Resources\Patients\Pages\ViewPatient;
use App\Filament\Resources\Patients\RelationManagers\CaretakersRelationManager;
use App\Filament\Resources\Patients\RelationManagers\CasesRelationManager;
use App\Filament\Resources\Patients\RelationManagers\DocumentsRelationManager;
use App\Filament\Resources\Patients\RelationManagers\FamilyMembersRelationManager;
use App\Filament\Resources\Patients\RelationManagers\HistoryRelationManager;
use App\Filament\Resources\Patients\RelationManagers\PatientIdsRelationManager;
use App\Filament\Resources\Patients\RelationManagers\WatchersRelationManager;
use App\Models\Patient;
use App\Models\Sector;
use App\Services\PatientMergeService;
use App\Services\PatientService;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Infolists\Components\TextEntry;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;
use Illuminate\Validation\ValidationException;

class PatientResource extends Resource
{
    protected static ?string $model = Patient::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedUserGroup;

    protected static string|null|\UnitEnum $navigationGroup = 'Patients';

    protected static ?string $recordTitleAttribute = 'last_name';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Identity')->columns(2)->schema([
                Select::make('sector_id')
                    ->label('Sector')
                    ->options(fn () => Sector::orderBy('name')->pluck('name', 'id'))
                    ->searchable()
                    ->required(),
                TextInput::make('hospital_id')
                    ->numeric()
                    ->helperText('From the hospital system, if any.'),
                TextInput::make('first_name')->required(),
                TextInput::make('last_name')->required(),
                TextInput::make('middle_name'),
                TextInput::make('extension_name'),
                Select::make('sex')->options(['male' => 'Male', 'female' => 'Female'])->required(),
                Select::make('civil_status')
                    ->options(['single' => 'Single', 'married' => 'Married', 'widowed' => 'Widowed', 'separated' => 'Separated'])
                    ->native(false),
                DatePicker::make('birthdate'),
                TextInput::make('estimated_age')->numeric()->helperText('When the birthdate is unknown.'),
            ]),
            Section::make('Address & contact')->columns(2)->schema([
                TextInput::make('address')->columnSpanFull(),
                TextInput::make('barangay'),
                TextInput::make('municipality'),
                TextInput::make('province'),
                TextInput::make('contact_number'),
            ]),
        ]);
    }

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Patient')->columns(3)->schema([
                TextEntry::make('mswd_id')->label('MSWD ID'),
                TextEntry::make('hospital_id')->label('Hospital ID')->placeholder('—'),
                TextEntry::make('sector.name')->label('Sector'),
                TextEntry::make('last_name'),
                TextEntry::make('first_name'),
                TextEntry::make('middle_name')->placeholder('—'),
                TextEntry::make('sex'),
                TextEntry::make('birthdate')->date()->placeholder('—'),
                TextEntry::make('civil_status')->placeholder('—'),
            ]),
            Section::make('Address & contact')->columns(2)->schema([
                TextEntry::make('address')->placeholder('—')->columnSpanFull(),
                TextEntry::make('barangay')->placeholder('—'),
                TextEntry::make('municipality')->placeholder('—'),
                TextEntry::make('province')->placeholder('—'),
                TextEntry::make('contact_number')->placeholder('—'),
            ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('mswd_id')->label('MSWD ID')->searchable()->sortable(),
                TextColumn::make('last_name')
                    ->label('Name')
                    ->formatStateUsing(fn (Patient $record) => "{$record->last_name}, {$record->first_name}")
                    ->searchable(['last_name', 'first_name']),
                TextColumn::make('hospital_id')->label('Hospital ID')->searchable()->toggleable(),
                TextColumn::make('sector.name')->label('Sector')->sortable(),
                TextColumn::make('sex')->toggleable(),
                TextColumn::make('cases_count')->counts('cases')->label('Cases')->badge(),
                TextColumn::make('created_at')->date()->sortable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('sector_id')
                    ->label('Sector')
                    ->options(fn () => Sector::orderBy('name')->pluck('name', 'id')),
                TrashedFilter::make(),
            ])
            ->recordActions([
                Action::make('view')
                    ->icon(Heroicon::OutlinedEye)
                    ->url(fn (Patient $record) => static::getUrl('view', ['record' => $record])),
                static::mergeAction(),
                static::archiveAction(),
                static::restoreAction(),
            ])
            ->defaultSort('last_name');
    }

    public static function getRelations(): array
    {
        return [
            PatientIdsRelationManager::class,
            FamilyMembersRelationManager::class,
            WatchersRelationManager::class,
            CaretakersRelationManager::class,
            CasesRelationManager::class,
            DocumentsRelationManager::class,
            HistoryRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListPatients::route('/'),
            'create' => CreatePatient::route('/create'),
            'view' => ViewPatient::route('/{record}'),
            'edit' => EditPatient::route('/{record}/edit'),
        ];
    }

    /**
     * Merge this patient into another, reassigning every owned record.
     */
    public static function mergeAction(): Action
    {
        return Action::make('merge')
            ->icon(Heroicon::OutlinedArrowsRightLeft)
            ->color('warning')
            ->visible(fn (Patient $record): bool => ! $record->trashed() && (auth()->user()?->can('patients.merge') ?? false))
            ->schema([
                Select::make('target_id')
                    ->label('Merge into')
                    ->required()
                    ->searchable()
                    ->getSearchResultsUsing(fn (string $search, Patient $record) => Patient::query()
                        ->whereKeyNot($record->id)
                        ->where(fn ($q) => $q->where('last_name', 'like', "%{$search}%")->orWhere('first_name', 'like', "%{$search}%"))
                        ->limit(20)->get()
                        ->mapWithKeys(fn (Patient $p) => [$p->id => "{$p->last_name}, {$p->first_name} (MSWD {$p->mswd_id})"]))
                    ->getOptionLabelUsing(fn ($value) => optional(Patient::find($value))->last_name),
            ])
            ->requiresConfirmation()
            ->action(function (Patient $record, array $data) {
                $target = Patient::findOrFail($data['target_id']);
                app(PatientMergeService::class)->merge($record, $target);
                Notification::make()->title('Patient merged')->success()->send();
            });
    }

    public static function archiveAction(): Action
    {
        return Action::make('archive')
            ->icon(Heroicon::OutlinedArchiveBox)
            ->color('danger')
            ->requiresConfirmation()
            ->visible(fn (Patient $record): bool => ! $record->trashed() && (auth()->user()?->can('patients.delete') ?? false))
            ->action(function (Patient $record) {
                try {
                    app(PatientService::class)->archive($record);
                    Notification::make()->title('Patient archived')->success()->send();
                } catch (ValidationException $e) {
                    Notification::make()->title('Cannot archive')
                        ->body(collect($e->errors())->flatten()->first())->danger()->send();
                }
            });
    }

    public static function restoreAction(): Action
    {
        return Action::make('restore')
            ->icon(Heroicon::OutlinedArrowUturnLeft)
            ->color('success')
            ->visible(fn (Patient $record): bool => $record->trashed() && (auth()->user()?->can('patients.delete') ?? false))
            ->action(function (Patient $record) {
                app(PatientService::class)->restore($record->id);
                Notification::make()->title('Patient restored')->success()->send();
            });
    }

    public static function canViewAny(): bool
    {
        return auth()->user()?->can('patients.view') ?? false;
    }

    public static function canView($record): bool
    {
        return auth()->user()?->can('patients.view') ?? false;
    }

    public static function canCreate(): bool
    {
        return auth()->user()?->can('patients.create') ?? false;
    }

    public static function canEdit($record): bool
    {
        return auth()->user()?->can('patients.update') ?? false;
    }
}
