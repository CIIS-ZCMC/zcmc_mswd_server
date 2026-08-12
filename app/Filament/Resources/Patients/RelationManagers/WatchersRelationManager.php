<?php

namespace App\Filament\Resources\Patients\RelationManagers;

use Filament\Actions\CreateAction;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class WatchersRelationManager extends RelationManager
{
    protected static string $relationship = 'watchers';

    protected static ?string $title = 'Watchers';

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')->required(),
            TextInput::make('relationship'),
            TextInput::make('contact_number'),
            TextInput::make('address'),
            Toggle::make('is_primary'),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')->searchable(),
                TextColumn::make('relationship'),
                TextColumn::make('contact_number')->placeholder('—'),
                IconColumn::make('is_primary')->boolean(),
            ])
            ->headerActions([CreateAction::make()])
            ->recordActions([EditAction::make(), DeleteAction::make()]);
    }
}
