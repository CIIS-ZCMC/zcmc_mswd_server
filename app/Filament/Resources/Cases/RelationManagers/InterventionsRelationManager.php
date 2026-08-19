<?php

namespace App\Filament\Resources\Cases\RelationManagers;

use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class InterventionsRelationManager extends RelationManager
{
    protected static string $relationship = 'interventions';

    protected static ?string $title = 'Interventions';

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('interventionType.name')->label('Type'),
                TextColumn::make('date_given')->date()->sortable(),
                TextColumn::make('description')->limit(50)->placeholder('—'),
                TextColumn::make('outcome')->limit(50)->placeholder('—'),
            ])
            ->defaultSort('date_given', 'desc');
    }
}
