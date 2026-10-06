<?php

namespace App\Filament\Resources\AssistanceSources;

use App\Filament\Resources\AssistanceSources\Pages\CreateAssistanceSource;
use App\Filament\Resources\AssistanceSources\Pages\EditAssistanceSource;
use App\Filament\Resources\AssistanceSources\Pages\ListAssistanceSources;
use App\Models\AssistanceSource;
use BackedEnum;
use Filament\Actions\EditAction;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

/**
 * Lookup of the sources a guarantee's breakdown lines use (City Mayor Assistance,
 * City Council Assistance, …). "Requires specify" makes a line say what the source is.
 */
class AssistanceSourceResource extends Resource
{
    protected static ?string $model = AssistanceSource::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedBanknotes;

    protected static string|null|\UnitEnum $navigationGroup = 'Reference Data';

    protected static ?int $navigationSort = 2;

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required()
                    ->maxLength(255),
                TextInput::make('code')
                    ->maxLength(255)
                    ->unique(ignoreRecord: true),
                Toggle::make('requires_specify')
                    ->label('Requires specify')
                    ->helperText('Breakdown lines with this source must say what it is (e.g. "Others").'),
                Toggle::make('is_active')
                    ->label('Active')
                    ->default(true),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('code')
                    ->toggleable()
                    ->placeholder('—'),
                IconColumn::make('requires_specify')
                    ->label('Requires specify')
                    ->boolean(),
                IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean(),
            ])
            ->recordActions([
                EditAction::make(),
            ])
            ->defaultSort('name');
    }

    public static function getPages(): array
    {
        return [
            'index' => ListAssistanceSources::route('/'),
            'create' => CreateAssistanceSource::route('/create'),
            'edit' => EditAssistanceSource::route('/{record}/edit'),
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
}
