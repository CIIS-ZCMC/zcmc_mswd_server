<?php

namespace App\Filament\Resources\Cases\RelationManagers;

use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class HistoryRelationManager extends RelationManager
{
    protected static string $relationship = 'auditLogs';

    protected static ?string $title = 'History';

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('created_at')->label('When')->dateTime()->sortable(),
                TextColumn::make('event')->badge(),
                TextColumn::make('description')->label('Change')->wrap(),
                TextColumn::make('causer.employee_name')->label('By')->placeholder('system'),
            ])
            ->defaultSort('created_at', 'desc');
    }
}
