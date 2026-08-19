<?php

namespace App\Filament\Resources\Cases\RelationManagers;

use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class AssessmentsRelationManager extends RelationManager
{
    protected static string $relationship = 'assessments';

    protected static ?string $title = 'Assessments';

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
            ->defaultSort('created_at', 'desc');
    }
}
