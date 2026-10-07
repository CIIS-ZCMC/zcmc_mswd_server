<?php

namespace App\Filament\Support;

use App\Filament\Concerns\ManagesSoftDeletedLookups;
use Filament\Actions\EditAction;
use Filament\Actions\RestoreAction;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rules\Unique;

/**
 * Shared form, table and access rules for the Library lists that assessments store by
 * code (modes of assistance, fund sources). The code is locked once an assessment uses
 * it, and a retired row is switched off rather than deleted so it keeps printing.
 */
abstract class AssessmentLookupResource extends Resource
{
    use ManagesSoftDeletedLookups;

    protected static string|null|\UnitEnum $navigationGroup = 'Reference Data';

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
                    ->unique(ignoreRecord: true)
                    ->helperText('What assessments store. It cannot change once an assessment uses it.')
                    ->disabled(fn (?Model $record) => $record !== null && $record->usageCount() > 0),
                TextInput::make('sort_order')
                    ->numeric()
                    ->integer()
                    ->minValue(0)
                    ->maxValue(65535)
                    ->default(0)
                    ->helperText('Lower numbers come first in the dropdown.'),
                Toggle::make('is_active')
                    ->label('Active')
                    ->default(true)
                    ->helperText('Turn off to hide it from new records; records that use it keep it.'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->withUsageCount())
            ->columns([
                TextColumn::make('name')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('code')
                    ->searchable()
                    ->toggleable(),
                TextColumn::make('sort_order')
                    ->label('Order')
                    ->sortable(),
                IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean(),
                TextColumn::make('usage_count')
                    ->label('Used in')
                    ->numeric(),
            ])
            ->filters([
                TrashedFilter::make(),
            ])
            ->recordActions([
                EditAction::make(),
                RestoreAction::make(),
            ])
            ->defaultSort('sort_order');
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
