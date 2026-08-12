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

class FamilyMembersRelationManager extends RelationManager
{
    protected static string $relationship = 'familyMembers';

    protected static ?string $title = 'Family & Socioeconomic';

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')->required(),
            TextInput::make('relationship'),
            TextInput::make('age')->numeric(),
            TextInput::make('occupation'),
            TextInput::make('monthly_income')->numeric()->prefix('₱'),
            TextInput::make('education'),
            Toggle::make('is_living_with_patient')->default(true),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')->searchable(),
                TextColumn::make('relationship'),
                TextColumn::make('occupation')->placeholder('—'),
                TextColumn::make('monthly_income')->money('PHP')->placeholder('—'),
                IconColumn::make('is_living_with_patient')->boolean()->label('Living with'),
            ])
            ->headerActions([CreateAction::make()])
            ->recordActions([EditAction::make(), DeleteAction::make()]);
    }
}
