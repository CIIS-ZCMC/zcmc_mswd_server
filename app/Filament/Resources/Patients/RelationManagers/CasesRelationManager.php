<?php

namespace App\Filament\Resources\Patients\RelationManagers;

use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class CasesRelationManager extends RelationManager
{
    protected static string $relationship = 'cases';

    protected static ?string $title = 'Cases';

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('case_code')->searchable(),
                TextColumn::make('case_type'),
                TextColumn::make('status')->badge()->colors([
                    'success' => 'open',
                    'warning' => 'ongoing',
                    'gray' => 'closed',
                    'info' => 'referred',
                ]),
                TextColumn::make('date_opened')->date()->sortable(),
            ])
            ->defaultSort('date_opened', 'desc');
    }
}
