<?php

namespace App\Filament\Resources\AssistantTypes;

use App\Filament\Concerns\ManagesSoftDeletedLookups;
use App\Filament\Resources\AssistantTypes\Pages\CreateAssistantType;
use App\Filament\Resources\AssistantTypes\Pages\EditAssistantType;
use App\Filament\Resources\AssistantTypes\Pages\ListAssistantTypes;
use App\Models\AssistantType;
use BackedEnum;
use Filament\Actions\EditAction;
use Filament\Actions\RestoreAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\Rules\Unique;

/**
 * Lookup of Types of Assistance (Medicines, Hospital Bill, …). Retire one with "Active"
 * off rather than deleting it: records that use it keep it, and it leaves the
 * new-record dropdowns.
 */
class AssistantTypeResource extends Resource
{
    use ManagesSoftDeletedLookups;

    protected static ?string $model = AssistantType::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedSquares2x2;

    protected static string|null|\UnitEnum $navigationGroup = 'Reference Data';

    protected static ?int $navigationSort = 2;

    protected static ?string $modelLabel = 'type of assistance';

    protected static ?string $pluralModelLabel = 'types of assistance';

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required()
                    ->maxLength(255)
                    ->unique(ignoreRecord: true, modifyRuleUsing: fn (Unique $rule) => $rule->whereNull('deleted_at')),
                TextInput::make('code')
                    ->required()
                    ->maxLength(64)
                    ->regex('/^[a-z0-9_]+$/')
                    ->validationMessages(['regex' => 'Use lowercase letters, numbers and underscores only.'])
                    ->unique(ignoreRecord: true),
                Select::make('category')
                    ->required()
                    ->options(fn (?AssistantType $record) => AssistantType::categoryOptions($record?->category)),
                TextInput::make('description')
                    ->maxLength(255),
                Toggle::make('is_active')
                    ->label('Active')
                    ->default(true)
                    ->helperText('Turn off to hide it from new records; records that use it keep it.'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->withCount(['patientAssistances', 'guaranteeItems']))
            ->columns([
                TextColumn::make('name')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('code')
                    ->searchable()
                    ->toggleable()
                    ->placeholder('—'),
                TextColumn::make('category')
                    ->badge()
                    ->formatStateUsing(fn (?string $state) => AssistantType::categoryOptions($state)[$state] ?? $state)
                    ->sortable(),
                TextColumn::make('description')
                    ->toggleable()
                    ->limit(40)
                    ->placeholder('—'),
                IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean(),
                TextColumn::make('usage')
                    ->label('Used in')
                    ->state(fn (AssistantType $record) => (int) $record->patient_assistances_count + (int) $record->guarantee_items_count)
                    ->numeric(),
            ])
            ->filters([
                SelectFilter::make('category')->options(AssistantType::CATEGORIES),
                TrashedFilter::make(),
            ])
            ->recordActions([
                EditAction::make(),
                RestoreAction::make(),
            ])
            ->defaultSort('name');
    }

    public static function getPages(): array
    {
        return [
            'index' => ListAssistantTypes::route('/'),
            'create' => CreateAssistantType::route('/create'),
            'edit' => EditAssistantType::route('/{record}/edit'),
        ];
    }

    public static function canViewAny(): bool
    {
        return auth()->user()?->can('settings.manage') ?? false;
    }

    public static function canCreate(): bool
    {
        return auth()->user()?->can('settings.manage') ?? false;
    }

    public static function canEdit($record): bool
    {
        return auth()->user()?->can('settings.manage') ?? false;
    }

    public static function canDelete($record): bool
    {
        return auth()->user()?->can('settings.manage') ?? false;
    }

    public static function canRestore($record): bool
    {
        return auth()->user()?->can('settings.manage') ?? false;
    }
}
