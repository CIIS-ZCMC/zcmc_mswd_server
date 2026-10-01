<?php

namespace App\Filament\Resources\Cases\RelationManagers;

use Filament\Actions\CreateAction;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use App\Models\Assessment;
use Filament\Forms\Components\CheckboxList;
use Filament\Forms\Components\Hidden;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;

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
            Select::make('classification')->options(self::CLASSIFICATIONS)->required(),
            TextInput::make('informant_name'),
            TextInput::make('informant_relationship'),
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
            TextInput::make('recommendation_mode')->label('Mode of assistance'),
            TextInput::make('fund_source'),
            Textarea::make('intervention_plan')->columnSpanFull(),
        ]);
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
                CreateAction::make(),
            ])
            ->recordActions([
                EditAction::make(),
                DeleteAction::make(),
            ]);
    }
}
