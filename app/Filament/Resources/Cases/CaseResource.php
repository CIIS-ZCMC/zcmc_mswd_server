<?php

namespace App\Filament\Resources\Cases;

use App\Filament\Resources\Cases\Pages\CreateCase;
use App\Filament\Resources\Cases\Pages\EditCase;
use App\Filament\Resources\Cases\Pages\ListCases;
use App\Filament\Resources\Cases\Pages\ViewCase;
use App\Filament\Resources\Cases\RelationManagers\ActivitiesRelationManager;
use App\Filament\Resources\Cases\RelationManagers\AssessmentsRelationManager;
use App\Filament\Resources\Cases\RelationManagers\DiagnosticsRelationManager;
use App\Filament\Resources\Cases\RelationManagers\DocumentsRelationManager;
use App\Filament\Resources\Cases\RelationManagers\HistoryRelationManager;
use App\Filament\Resources\Cases\RelationManagers\InterventionsRelationManager;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\User;
use App\Services\CaseModelService;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
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

class CaseResource extends Resource
{
    protected static ?string $model = CaseModel::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedFolderOpen;

    protected static string|null|\UnitEnum $navigationGroup = 'Cases';

    protected static ?string $recordTitleAttribute = 'case_code';

    protected static ?string $modelLabel = 'case';

    private const CASE_TYPES = ['medical' => 'Medical', 'financial' => 'Financial', 'psychosocial' => 'Psychosocial', 'others' => 'Others'];

    private const PRIORITIES = ['low' => 'Low', 'medium' => 'Medium', 'high' => 'High'];

    private const ADMISSION_TYPES = ['OPD' => 'OPD', 'ER' => 'ER', 'inpatient' => 'Inpatient'];

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Case')->columns(2)->schema([
                Select::make('patient_id')
                    ->label('Patient')
                    ->searchable()
                    ->required()
                    ->getSearchResultsUsing(fn (string $search) => Patient::query()
                        ->where('last_name', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->limit(20)->get()
                        ->mapWithKeys(fn (Patient $p) => [$p->id => "{$p->last_name}, {$p->first_name}"]))
                    ->getOptionLabelUsing(fn ($value) => optional(Patient::find($value))->last_name),
                Select::make('assigned_user_id')
                    ->label('Assigned worker')
                    ->options(fn () => User::orderBy('employee_name')->pluck('employee_name', 'id'))
                    ->searchable()
                    ->helperText('Defaults to you if left blank.'),
                Select::make('case_type')->options(self::CASE_TYPES)->required(),
                Select::make('priority_level')->options(self::PRIORITIES)->required(),
                Select::make('admission_type')->options(self::ADMISSION_TYPES)->required(),
                DatePicker::make('date_opened')->default(now()),
            ]),
        ]);
    }

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Case')->columns(3)->schema([
                TextEntry::make('case_code'),
                TextEntry::make('status')->badge(),
                TextEntry::make('priority_level')->badge(),
                TextEntry::make('case_type'),
                TextEntry::make('admission_type'),
                TextEntry::make('assignedUser.employee_name')->label('Assigned worker'),
                TextEntry::make('date_opened')->date(),
                TextEntry::make('date_closed')->date()->placeholder('—'),
            ]),
            Section::make('Patient')->columns(3)->schema([
                TextEntry::make('patient.last_name')->label('Last name'),
                TextEntry::make('patient.first_name')->label('First name'),
                TextEntry::make('patient.sex'),
            ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('case_code')->searchable()->sortable(),
                TextColumn::make('patient.last_name')->label('Patient')
                    ->formatStateUsing(fn (CaseModel $record) => $record->patient
                        ? "{$record->patient->last_name}, {$record->patient->first_name}" : '—')
                    ->searchable(),
                TextColumn::make('case_type')->toggleable(),
                TextColumn::make('priority_level')->badge()->colors([
                    'gray' => 'low', 'warning' => 'medium', 'danger' => 'high',
                ]),
                TextColumn::make('status')->badge()->colors([
                    'success' => 'open', 'warning' => 'ongoing', 'gray' => 'closed', 'info' => 'referred',
                ]),
                TextColumn::make('assignedUser.employee_name')->label('Worker')->toggleable(),
                TextColumn::make('date_opened')->date()->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')->options([
                    'open' => 'Open', 'ongoing' => 'Ongoing', 'closed' => 'Closed', 'referred' => 'Referred',
                ]),
                SelectFilter::make('case_type')->options(self::CASE_TYPES),
                SelectFilter::make('priority_level')->options(self::PRIORITIES),
                TrashedFilter::make(),
            ])
            ->recordActions([
                Action::make('view')
                    ->icon(Heroicon::OutlinedEye)
                    ->url(fn (CaseModel $record) => static::getUrl('view', ['record' => $record])),
                static::assignAction(),
                static::closeAction(),
                static::referAction(),
                static::reopenAction(),
                static::archiveAction(),
                static::restoreAction(),
            ])
            ->defaultSort('date_opened', 'desc');
    }

    public static function getRelations(): array
    {
        return [
            ActivitiesRelationManager::class,
            AssessmentsRelationManager::class,
            DiagnosticsRelationManager::class,
            InterventionsRelationManager::class,
            DocumentsRelationManager::class,
            HistoryRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListCases::route('/'),
            'create' => CreateCase::route('/create'),
            'view' => ViewCase::route('/{record}'),
            'edit' => EditCase::route('/{record}/edit'),
        ];
    }

    public static function assignAction(): Action
    {
        return Action::make('assign')
            ->icon(Heroicon::OutlinedUserPlus)
            ->color('gray')
            ->visible(fn (CaseModel $record): bool => ! $record->trashed() && (auth()->user()?->can('cases.update') ?? false))
            ->schema([
                Select::make('assigned_user_id')
                    ->label('Assign to')
                    ->options(fn () => User::orderBy('employee_name')->pluck('employee_name', 'id'))
                    ->searchable()
                    ->required(),
            ])
            ->action(function (CaseModel $record, array $data) {
                app(CaseModelService::class)->assign($record, User::findOrFail($data['assigned_user_id']), auth()->user());
                Notification::make()->title('Case reassigned')->success()->send();
            });
    }

    public static function closeAction(): Action
    {
        return Action::make('close')
            ->icon(Heroicon::OutlinedCheckCircle)
            ->color('success')
            ->requiresConfirmation()
            ->visible(fn (CaseModel $record): bool => ! $record->trashed()
                && $record->status !== CaseModel::STATUS_CLOSED
                && (auth()->user()?->can('cases.update') ?? false))
            ->action(function (CaseModel $record) {
                app(CaseModelService::class)->close($record, auth()->user());
                Notification::make()->title('Case closed')->success()->send();
            });
    }

    public static function referAction(): Action
    {
        return Action::make('refer')
            ->icon(Heroicon::OutlinedArrowUpRight)
            ->color('info')
            ->visible(fn (CaseModel $record): bool => ! $record->trashed() && (auth()->user()?->can('cases.update') ?? false))
            ->schema([Textarea::make('notes')->label('Referral notes')])
            ->action(function (CaseModel $record, array $data) {
                app(CaseModelService::class)->refer($record, auth()->user(), $data['notes'] ?? null);
                Notification::make()->title('Case referred')->success()->send();
            });
    }

    public static function reopenAction(): Action
    {
        return Action::make('reopen')
            ->icon(Heroicon::OutlinedArrowPath)
            ->color('warning')
            ->requiresConfirmation()
            ->visible(fn (CaseModel $record): bool => ! $record->trashed()
                && in_array($record->status, [CaseModel::STATUS_CLOSED, CaseModel::STATUS_REFERRED], true)
                && (auth()->user()?->can('cases.update') ?? false))
            ->action(function (CaseModel $record) {
                app(CaseModelService::class)->reopen($record, auth()->user());
                Notification::make()->title('Case reopened')->success()->send();
            });
    }

    public static function archiveAction(): Action
    {
        return Action::make('archive')
            ->icon(Heroicon::OutlinedArchiveBox)
            ->color('danger')
            ->requiresConfirmation()
            ->visible(fn (CaseModel $record): bool => ! $record->trashed() && (auth()->user()?->can('cases.delete') ?? false))
            ->action(function (CaseModel $record) {
                try {
                    app(CaseModelService::class)->archive($record);
                    Notification::make()->title('Case archived')->success()->send();
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
            ->visible(fn (CaseModel $record): bool => $record->trashed() && (auth()->user()?->can('cases.delete') ?? false))
            ->action(function (CaseModel $record) {
                app(CaseModelService::class)->restore($record->id);
                Notification::make()->title('Case restored')->success()->send();
            });
    }

    public static function canViewAny(): bool
    {
        return auth()->user()?->can('cases.view') ?? false;
    }

    public static function canView($record): bool
    {
        return auth()->user()?->can('cases.view') ?? false;
    }

    public static function canCreate(): bool
    {
        return auth()->user()?->can('cases.create') ?? false;
    }

    public static function canEdit($record): bool
    {
        return auth()->user()?->can('cases.update') ?? false;
    }
}
