<?php

namespace App\Filament\Resources\Cases\RelationManagers;

use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class DiagnosticsRelationManager extends RelationManager
{
    protected static string $relationship = 'diagnostics';

    protected static ?string $title = 'Diagnostics';

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('diagnosis_name')->searchable(),
                TextColumn::make('diagnosis_date')->date()->sortable(),
                TextColumn::make('attending_physician')->placeholder('—'),
                TextColumn::make('reports_count')->counts('reports')->label('Reports')->badge(),
            ])
            ->defaultSort('diagnosis_date', 'desc');
    }
}
