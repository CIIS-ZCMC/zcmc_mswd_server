<?php

namespace App\Filament\Resources\Guarantors;

use App\Filament\Concerns\ManagesSoftDeletedLookups;
use App\Filament\Resources\Guarantors\Pages\CreateGuarantor;
use App\Filament\Resources\Guarantors\Pages\EditGuarantor;
use App\Filament\Resources\Guarantors\Pages\ListGuarantors;
use App\Models\Guarantor;
use BackedEnum;
use Filament\Actions\EditAction;
use Filament\Actions\RestoreAction;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;

/**
 * Lookup of guarantors (MAIFIP, PCSO, DSWD, …). Retire an entry with "Active" off
 * rather than deleting it: inactive guarantors stay on historical records but leave
 * the new-record dropdowns.
 */
class GuarantorResource extends Resource
{
    use ManagesSoftDeletedLookups;

    protected static ?string $model = Guarantor::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedBuildingLibrary;

    protected static string|null|\UnitEnum $navigationGroup = 'Reference Data';

    protected static ?int $navigationSort = 1;

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required()
                    ->maxLength(255),
                TextInput::make('address')
                    ->maxLength(255),
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
                TextColumn::make('address')
                    ->toggleable()
                    ->placeholder('—'),
                IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean(),
            ])
            ->filters([
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
            'index' => ListGuarantors::route('/'),
            'create' => CreateGuarantor::route('/create'),
            'edit' => EditGuarantor::route('/{record}/edit'),
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

    public static function canRestore($record): bool
    {
        return auth()->user()?->can('settings.manage') ?? false;
    }

    public static function canDelete($record): bool
    {
        return auth()->user()?->can('settings.manage') ?? false;
    }
}
