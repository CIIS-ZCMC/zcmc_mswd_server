<?php

namespace App\Filament\Resources\UnifiedIntakeSheets;

use App\Filament\Resources\UnifiedIntakeSheets\Pages\CreateUnifiedIntakeSheet;
use App\Filament\Resources\UnifiedIntakeSheets\Pages\ListUnifiedIntakeSheets;
use App\Filament\Resources\UnifiedIntakeSheets\Pages\ViewUnifiedIntakeSheet;
use App\Filament\Resources\UnifiedIntakeSheets\RelationManagers\ActivitiesRelationManager;
use App\Models\AssistantType;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\UnifiedIntakeSheet;
use App\Services\UnifiedIntakeSheetPdfService;
use App\Services\UnifiedIntakeSheetService;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Hidden;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Infolists\Components\TextEntry;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Schemas\Components\Wizard;
use Filament\Schemas\Components\Wizard\Step;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Validation\ValidationException;

class UnifiedIntakeSheetResource extends Resource
{
    protected static ?string $model = UnifiedIntakeSheet::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedDocumentText;

    protected static string|null|\UnitEnum $navigationGroup = 'Intake';

    protected static ?string $recordTitleAttribute = 'intake_no';

    protected static ?string $modelLabel = 'intake sheet';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Wizard::make([
                Step::make('Patient')
                    ->schema([
                        Select::make('patient_id')
                            ->label('Reuse existing patient')
                            ->searchable()
                            ->live()
                            ->getSearchResultsUsing(fn (string $search) => Patient::query()
                                ->where('last_name', 'like', "%{$search}%")
                                ->orWhere('first_name', 'like', "%{$search}%")
                                ->limit(20)
                                ->get()
                                ->mapWithKeys(fn (Patient $p) => [$p->id => "{$p->last_name}, {$p->first_name}"]))
                            ->getOptionLabelUsing(fn ($value) => optional(Patient::find($value))->last_name)
                            // Preload the patient's current family & IDs so an
                            // intake edits (and updates) them rather than duplicating.
                            ->afterStateUpdated(function ($state, Set $set): void {
                                $patient = filled($state)
                                    ? Patient::with(['familyMembers', 'patientIds'])->find($state)
                                    : null;

                                $set('family_members', $patient
                                    ? $patient->familyMembers->map(fn ($m) => [
                                        'id' => $m->id, 'name' => $m->name, 'relationship' => $m->relationship,
                                        'age' => $m->age, 'occupation' => $m->occupation, 'monthly_income' => $m->monthly_income,
                                    ])->all()
                                    : []);

                                $set('patient_ids', $patient
                                    ? $patient->patientIds->map(fn ($i) => [
                                        'id' => $i->id, 'id_type' => $i->id_type, 'id_number' => $i->id_number,
                                    ])->all()
                                    : []);
                            })
                            ->helperText('Search to reuse a patient (their family & IDs load for editing); leave blank to register a new one.'),
                        Section::make('New patient')
                            ->visible(fn (Get $get): bool => blank($get('patient_id')))
                            ->columns(2)
                            ->schema([
                                Select::make('patient.sector_id')
                                    ->label('Sector')
                                    ->options(fn () => Sector::orderBy('name')->pluck('name', 'id'))
                                    ->required(fn (Get $get) => blank($get('patient_id'))),
                                Select::make('patient.sex')
                                    ->options(['male' => 'Male', 'female' => 'Female'])
                                    ->required(fn (Get $get) => blank($get('patient_id'))),
                                TextInput::make('patient.first_name')
                                    ->required(fn (Get $get) => blank($get('patient_id'))),
                                TextInput::make('patient.last_name')
                                    ->required(fn (Get $get) => blank($get('patient_id'))),
                                TextInput::make('patient.middle_name'),
                                DatePicker::make('patient.birthdate'),
                                TextInput::make('patient.civil_status'),
                                TextInput::make('patient.contact_number'),
                                TextInput::make('patient.address')->columnSpanFull(),
                            ]),
                    ]),

                Step::make('Family & Socioeconomic')
                    ->description('For an existing patient these load pre-filled and are updated on save.')
                    ->schema([
                        Repeater::make('family_members')
                            ->schema([
                                Hidden::make('id'),
                                TextInput::make('name')->required(),
                                TextInput::make('relationship'),
                                TextInput::make('age')->numeric(),
                                TextInput::make('occupation'),
                                TextInput::make('monthly_income')->numeric()->prefix('₱'),
                            ])
                            ->columns(2)
                            ->defaultItems(0)
                            ->addActionLabel('Add family member'),
                    ]),

                Step::make('Identification')
                    ->description('For an existing patient these load pre-filled and are updated on save.')
                    ->schema([
                        Repeater::make('patient_ids')
                            ->schema([
                                Hidden::make('id'),
                                TextInput::make('id_type')->required(),
                                TextInput::make('id_number')->required(),
                            ])
                            ->columns(2)
                            ->defaultItems(0)
                            ->addActionLabel('Add ID'),
                    ]),

                Step::make('Case')
                    ->schema([
                        Select::make('case_id')
                            ->label('Attach to an existing open case')
                            ->searchable()
                            ->live()
                            ->options(fn () => CaseModel::query()
                                ->whereIn('status', UnifiedIntakeSheet::ATTACHABLE_CASE_STATUSES)
                                ->pluck('case_code', 'id'))
                            ->helperText('Leave blank to open a new case.'),
                        Section::make('New case')
                            ->visible(fn (Get $get): bool => blank($get('case_id')))
                            ->columns(2)
                            ->schema([
                                Select::make('case.case_type')
                                    ->options(['medical' => 'Medical', 'financial' => 'Financial', 'psychosocial' => 'Psychosocial', 'others' => 'Others'])
                                    ->required(fn (Get $get) => blank($get('case_id'))),
                                Select::make('case.priority_level')
                                    ->options(['low' => 'Low', 'medium' => 'Medium', 'high' => 'High'])
                                    ->required(fn (Get $get) => blank($get('case_id'))),
                                Select::make('case.admission_type')
                                    ->options(['OPD' => 'OPD', 'ER' => 'ER', 'inpatient' => 'Inpatient'])
                                    ->required(fn (Get $get) => blank($get('case_id'))),
                                DatePicker::make('case.date_opened'),
                            ]),
                    ]),

                Step::make('Assessment')
                    ->columns(2)
                    ->schema([
                        Select::make('assessment.classification')
                            ->options(['indigent' => 'Indigent', 'low_income' => 'Low income', 'self_sufficient' => 'Self-sufficient', 'others' => 'Others'])
                            ->required(),
                        TextInput::make('assessment.total_family_income')->numeric()->prefix('₱'),
                        Textarea::make('assessment.presenting_problem')->columnSpanFull(),
                        Textarea::make('assessment.family_background')->columnSpanFull(),
                        Textarea::make('assessment.intervention_plan')->columnSpanFull(),
                    ]),

                Step::make('Recommended Assistance')
                    ->schema([
                        Repeater::make('assistances')
                            ->schema([
                                Select::make('assistant_type_id')
                                    ->label('Type')
                                    ->options(fn () => AssistantType::where('is_active', true)->pluck('name', 'id'))
                                    ->required(),
                                TextInput::make('amount')->numeric()->prefix('₱'),
                                TextInput::make('notes'),
                            ])
                            ->columns(3)
                            ->defaultItems(0)
                            ->addActionLabel('Add assistance'),
                    ]),

                Step::make('Intake Details')
                    ->columns(2)
                    ->schema([
                        Select::make('referral_source')
                            ->options(['walk_in' => 'Walk-in', 'ward_referral' => 'Ward referral', 'mswdo' => 'MSWDO', 'others' => 'Others']),
                        DatePicker::make('date_of_intake')->default(now()),
                        Textarea::make('remarks')->columnSpanFull(),
                    ]),
            ])->columnSpanFull(),
        ]);
    }

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Intake')->columns(3)->schema([
                TextEntry::make('intake_no'),
                TextEntry::make('status')->badge(),
                TextEntry::make('date_of_intake')->date(),
                TextEntry::make('intakeWorker.employee_name')->label('Intake worker'),
                TextEntry::make('referral_source')->placeholder('—'),
                TextEntry::make('finalizer.employee_name')->label('Finalized by')->placeholder('—'),
            ]),
            Section::make('Patient')->columns(3)->schema([
                TextEntry::make('patient.last_name')->label('Last name'),
                TextEntry::make('patient.first_name')->label('First name'),
                TextEntry::make('patient.sex'),
            ]),
            Section::make('Case')->columns(3)->schema([
                TextEntry::make('case.case_code')->label('Case code'),
                TextEntry::make('case.case_type')->label('Type'),
                TextEntry::make('case.priority_level')->label('Priority'),
            ]),
            Section::make('Assessment')->columns(2)->schema([
                TextEntry::make('assessment.classification')->placeholder('—'),
                TextEntry::make('assessment.presenting_problem')->placeholder('—')->columnSpanFull(),
            ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('intake_no')->searchable()->sortable(),
                TextColumn::make('patient.last_name')->label('Patient')
                    ->formatStateUsing(fn ($record) => $record->patient ? "{$record->patient->last_name}, {$record->patient->first_name}" : '—')
                    ->searchable(),
                TextColumn::make('status')->badge()->colors([
                    'gray' => 'draft',
                    'warning' => 'submitted',
                    'success' => 'finalized',
                    'danger' => 'cancelled',
                ]),
                TextColumn::make('intakeWorker.employee_name')->label('Worker')->toggleable(),
                TextColumn::make('date_of_intake')->date()->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')->options([
                    'draft' => 'Draft',
                    'submitted' => 'Submitted',
                    'finalized' => 'Finalized',
                    'cancelled' => 'Cancelled',
                ]),
            ])
            ->recordActions([
                Action::make('view')
                    ->icon(Heroicon::OutlinedEye)
                    ->url(fn (UnifiedIntakeSheet $record) => static::getUrl('view', ['record' => $record])),
                static::printAction(),
                static::finalizeAction(),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [
            ActivitiesRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListUnifiedIntakeSheets::route('/'),
            'create' => CreateUnifiedIntakeSheet::route('/create'),
            'view' => ViewUnifiedIntakeSheet::route('/{record}'),
        ];
    }

    /**
     * Download the official (or draft) PDF, reusing the Phase 2 renderer.
     */
    public static function printAction(): Action
    {
        return Action::make('print')
            ->label('Print')
            ->icon(Heroicon::OutlinedPrinter)
            ->color('gray')
            ->action(function (UnifiedIntakeSheet $record) {
                $pdf = app(UnifiedIntakeSheetPdfService::class);

                return response()->streamDownload(
                    fn () => print ($pdf->render($record)->output()),
                    $pdf->filename($record),
                );
            });
    }

    public static function finalizeAction(): Action
    {
        return Action::make('finalize')
            ->icon(Heroicon::OutlinedCheckBadge)
            ->color('success')
            ->requiresConfirmation()
            ->visible(fn (UnifiedIntakeSheet $record): bool => $record->isEditable() && (auth()->user()?->can('intake.finalize') ?? false))
            ->action(function (UnifiedIntakeSheet $record) {
                try {
                    app(UnifiedIntakeSheetService::class)->finalize($record, auth()->user());
                    Notification::make()->title('Intake finalized')->success()->send();
                } catch (ValidationException $e) {
                    Notification::make()->title('Cannot finalize')
                        ->body(collect($e->errors())->flatten()->first())
                        ->danger()->send();
                }
            });
    }

    public static function cancelAction(): Action
    {
        return Action::make('cancel')
            ->label('Cancel intake')
            ->icon(Heroicon::OutlinedXCircle)
            ->color('danger')
            ->requiresConfirmation()
            ->visible(fn (UnifiedIntakeSheet $record): bool => $record->isEditable() && (auth()->user()?->can('intake.delete') ?? false))
            ->action(function (UnifiedIntakeSheet $record) {
                app(UnifiedIntakeSheetService::class)->cancel($record);
                Notification::make()->title('Intake cancelled')->success()->send();
            });
    }

    public static function canViewAny(): bool
    {
        return auth()->user()?->can('intake.view') ?? false;
    }

    public static function canView($record): bool
    {
        return auth()->user()?->can('intake.view') ?? false;
    }

    public static function canCreate(): bool
    {
        return auth()->user()?->can('intake.create') ?? false;
    }

    // Editing happens through the wizard on create and the finalize/cancel
    // actions; there is no free-form edit page.
    public static function canEdit($record): bool
    {
        return false;
    }
}
