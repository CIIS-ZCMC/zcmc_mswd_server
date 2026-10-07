<?php

namespace App\Filament\Resources\Cases\RelationManagers;

use App\DTOs\AssessmentDto;
use App\Exceptions\WatcherRequirementNotSatisfiedException;
use App\Models\Assessment;
use App\Models\FundSource;
use App\Models\ModeOfAssistance;
use App\Services\AssessmentService;
use App\Services\CaseModelService;
use Filament\Actions\CreateAction;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\CheckboxList;
use Filament\Forms\Components\Hidden;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

class AssessmentsRelationManager extends RelationManager
{
    protected static string $relationship = 'assessments';

    protected static ?string $title = 'Assessments';

    /** @param array<int, string> $keys */
    private static function labels(array $keys): array
    {
        return collect($keys)->mapWithKeys(fn ($k) => [$k => ucfirst(str_replace('_', ' ', $k))])->all();
    }

    private const CLASSIFICATIONS = [
        'A' => 'A — Full pay',
        'B' => 'B — 25% discount',
        'C1' => 'C1 — 50% discount',
        'C2' => 'C2 — 75% discount',
        'C3' => 'C3 — 100% discount',
        'D' => 'D — No income',
        'indigent' => 'Indigent',
        'low_income' => 'Low income',
        'self_sufficient' => 'Self-sufficient',
        'others' => 'Others',
    ];

    /**
     * Keep the manager editable on the case View page (Filament makes relation
     * managers read-only there by default).
     */
    public function isReadOnly(): bool
    {
        return false;
    }

    public function canCreate(): bool
    {
        return auth()->user()?->can('cases.update') ?? false;
    }

    public function canEdit(Model $record): bool
    {
        return auth()->user()?->can('cases.update') ?? false;
    }

    public function canDelete(Model $record): bool
    {
        return auth()->user()?->can('cases.update') ?? false;
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Hidden::make('created_by')->default(fn () => auth()->id()),
            Select::make('classification')
                // Pre-MSWD rows hold a legacy value (indigent, low_income, …) that is
                // not in the list; keep it selectable so editing never blanks it.
                ->options(fn (?Model $record): array => $record?->classification && ! isset(self::CLASSIFICATIONS[$record->classification])
                    ? [$record->classification => ucfirst(str_replace('_', ' ', $record->classification)).' (legacy)'] + self::CLASSIFICATIONS
                    : self::CLASSIFICATIONS)
                ->helperText('Leave blank to use the MSWD classification calculated from income, expenses and household size.'),
            Textarea::make('classification_override_reason')
                ->helperText('Why the classification differs from the calculated one.')
                ->columnSpanFull(),
            TextInput::make('informant_name')->helperText('Full name as printed, e.g. "Reyes, Ana M."'),
            TextInput::make('informant_last_name'),
            TextInput::make('informant_first_name'),
            TextInput::make('informant_middle_name'),
            TextInput::make('informant_relationship'),
            TextInput::make('informant_contact_number'),
            TextInput::make('informant_address')->columnSpanFull(),
            TextInput::make('referral_source'),
            TextInput::make('total_family_income')->numeric()->prefix('₱'),
            Repeater::make('other_income_sources')
                ->label('Other sources of family income')
                ->schema([
                    TextInput::make('source')->required(),
                    TextInput::make('amount')->numeric()->minValue(0)->prefix('₱'),
                ])
                ->columns(2)
                ->defaultItems(0)
                ->addActionLabel('Add income source')
                ->columnSpanFull(),
            Textarea::make('presenting_problem')->columnSpanFull(),
            CheckboxList::make('problem_categories')->options(self::labels(Assessment::PROBLEM_CATEGORIES))->columns(3)->columnSpanFull(),
            Textarea::make('problem_specify')->columnSpanFull(),
            Select::make('house_tenure')->options(self::labels(Assessment::HOUSE_TENURES)),
            CheckboxList::make('light_source')->options(self::labels(Assessment::LIGHT_SOURCES))->columns(3),
            CheckboxList::make('water_source')->options(self::labels(Assessment::WATER_SOURCES))->columns(3),
            Textarea::make('family_background')->columnSpanFull(),
            Textarea::make('medical_history')->columnSpanFull(),
            Textarea::make('recommendation')->columnSpanFull(),
            Select::make('recommendation_mode')
                ->label('Mode of assistance')
                ->options(fn (?Assessment $record) => ModeOfAssistance::options($record?->recommendation_mode)),
            Select::make('fund_source')
                ->options(fn (?Assessment $record) => FundSource::options($record?->fund_source)),
            Textarea::make('intervention_plan')->columnSpanFull(),
        ]);
    }

    /**
     * Runs a service call, turning its domain refusals (unmet watcher
     * requirement, a locked finalized report) into a notification instead of a
     * 500, and halting the action.
     */
    private static function guarded(CreateAction|EditAction $action, \Closure $callback): ?Model
    {
        try {
            return $callback();
        } catch (WatcherRequirementNotSatisfiedException|ValidationException $e) {
            Notification::make()->danger()->title('Could not save the assessment')
                ->body($e instanceof ValidationException ? collect($e->errors())->flatten()->implode(' ') : $e->getMessage())
                ->send();

            $action->halt();

            return null;
        }
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('classification')->badge(),
                TextColumn::make('total_family_income')->money('PHP')->placeholder('—'),
                TextColumn::make('presenting_problem')->limit(50)->placeholder('—'),
                TextColumn::make('createdBy.employee_name')->label('By')->toggleable(),
                TextColumn::make('created_at')->dateTime()->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->headerActions([
                // Through AssessmentService, like the API: it enforces the watcher
                // requirement and calculates the MSWD classification.
                CreateAction::make()->using(function (array $data, CreateAction $action): ?Model {
                    $case = $this->getOwnerRecord();

                    return self::guarded($action, function () use ($data, $case) {
                        $assessment = app(AssessmentService::class)->create(AssessmentDto::fromArray(array_merge($data, [
                            'case_id' => $case->id,
                            'created_by' => auth()->id(),
                        ])));

                        app(CaseModelService::class)->logMilestone(
                            $case, auth()->user(), 'assessment_completed', "Assessment #{$assessment->id} recorded",
                        );

                        return $assessment;
                    });
                }),
            ])
            ->recordActions([
                EditAction::make()->using(fn (Model $record, array $data, EditAction $action): Model => self::guarded(
                    $action,
                    fn () => app(AssessmentService::class)->update($record, AssessmentDto::fromArray($data)),
                ) ?? $record),
                DeleteAction::make(),
            ]);
    }
}
