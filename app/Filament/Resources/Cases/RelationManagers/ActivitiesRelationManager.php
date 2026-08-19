<?php

namespace App\Filament\Resources\Cases\RelationManagers;

use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class ActivitiesRelationManager extends RelationManager
{
    protected static string $relationship = 'activities';

    protected static ?string $title = 'Timeline';

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('activity_date')->label('When')->dateTime()->sortable(),
                TextColumn::make('activity_type')->badge(),
                TextColumn::make('assignedUser.employee_name')->label('By')->placeholder('—'),
                TextColumn::make('notes')->wrap()->placeholder('—'),
            ])
            ->defaultSort('activity_date', 'desc');
    }
}
