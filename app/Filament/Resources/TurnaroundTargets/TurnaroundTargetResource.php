<?php

namespace App\Filament\Resources\TurnaroundTargets;

use App\Filament\Resources\TurnaroundTargets\Pages\EditTurnaroundTarget;
use App\Filament\Resources\TurnaroundTargets\Pages\ListTurnaroundTargets;
use App\Models\TurnaroundTarget;
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

class TurnaroundTargetResource extends Resource
{
    protected static ?string $model = TurnaroundTarget::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedClock;

    protected static string|null|\UnitEnum $navigationGroup = 'Reference Data';

    protected static ?int $navigationSort = 7;

    protected static ?string $modelLabel = 'turnaround target';

    protected static ?string $pluralModelLabel = 'turnaround targets';

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('stage')
                    ->label('Stage')
                    ->formatStateUsing(fn (?string $state) => TurnaroundTarget::STAGE_LABELS[$state] ?? $state)
                    ->disabled()
                    ->dehydrated(false),
                TextInput::make('minutes')
                    ->label('Target (minutes)')
                    ->numeric()
                    ->integer()
                    ->minValue(1)
                    ->maxValue(1440)
                    ->required()
                    ->helperText("Citizen's Charter standard time threshold in minutes."),
                Toggle::make('is_active')
                    ->label('Active')
                    ->default(true)
                    ->helperText('Whether this stage is evaluated for compliance.'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('stage')
                    ->label('Stage')
                    ->formatStateUsing(fn (string $state) => TurnaroundTarget::STAGE_LABELS[$state] ?? $state)
                    ->sortable(),
                TextColumn::make('description')
                    ->label('Description')
                    ->wrap(),
                TextColumn::make('minutes')
                    ->label('Target (minutes)')
                    ->numeric()
                    ->sortable(),
                IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean(),
            ])
            ->recordActions([
                EditAction::make(),
            ])
            ->defaultSort('id');
    }

    public static function getPages(): array
    {
        return [
            'index' => ListTurnaroundTargets::route('/'),
            'edit' => EditTurnaroundTarget::route('/{record}/edit'),
        ];
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canDelete($record): bool
    {
        return false;
    }

    public static function canViewAny(): bool
    {
        return auth()->user()?->can('library.manage') ?? false;
    }

    public static function canEdit($record): bool
    {
        return auth()->user()?->can('library.manage') ?? false;
    }
}
