<?php

namespace App\Filament\Resources\Patients\RelationManagers;

use App\Models\WatcherRelationshipType;
use Filament\Actions\CreateAction;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
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
            Select::make('relationship_code')
                ->label('Relationship')
                ->options(fn () => WatcherRelationshipType::orderBy('name')->pluck('name', 'code'))
                ->required(),
            TextInput::make('contact_number'),
            TextInput::make('address'),
            Textarea::make('notes'),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')->searchable(),
                TextColumn::make('relationshipType.name')->label('Relationship'),
                TextColumn::make('contact_number')->placeholder('—'),
            ])
            ->headerActions([CreateAction::make()])
            ->recordActions([EditAction::make(), DeleteAction::make()]);
    }
}
