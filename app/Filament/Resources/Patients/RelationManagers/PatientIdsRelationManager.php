<?php

namespace App\Filament\Resources\Patients\RelationManagers;

use Filament\Actions\CreateAction;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class PatientIdsRelationManager extends RelationManager
{
    protected static string $relationship = 'patientIds';

    protected static ?string $title = 'Identification';

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('id_type')->required(),
            TextInput::make('id_number')->required(),
            DatePicker::make('date_issued'),
            DatePicker::make('date_expiry'),
            Toggle::make('is_verified'),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('id_type')->searchable(),
                TextColumn::make('id_number')->searchable(),
                TextColumn::make('date_expiry')->date()->placeholder('—'),
                IconColumn::make('is_verified')->boolean(),
            ])
            ->headerActions([CreateAction::make()])
            ->recordActions([EditAction::make(), DeleteAction::make()]);
    }
}
