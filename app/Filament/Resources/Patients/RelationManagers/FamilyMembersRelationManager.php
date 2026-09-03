<?php

namespace App\Filament\Resources\Patients\RelationManagers;

use Filament\Actions\CreateAction;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
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
            DatePicker::make('birthdate'),
            Select::make('sex')
                ->options(['male' => 'Male', 'female' => 'Female'])
                ->native(false),
            TextInput::make('age')->numeric()->helperText('When the birthdate is unknown.'),
            TextInput::make('educational_attainment')->label('Educational attainment'),
            TextInput::make('occupation'),
            TextInput::make('monthly_income')->numeric()->prefix('₱'),
            Toggle::make('is_living_with_patient')->default(true),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')->searchable(),
                TextColumn::make('relationship'),
                TextColumn::make('sex')->placeholder('—'),
                TextColumn::make('age')->placeholder('—'),
                // `age` already conveys this at a glance, so keep it off by default.
                TextColumn::make('birthdate')->date()->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('educational_attainment')->label('Education')->placeholder('—')
                    ->toggleable(),
                TextColumn::make('occupation')->placeholder('—'),
                TextColumn::make('monthly_income')->money('PHP')->placeholder('—'),
                IconColumn::make('is_living_with_patient')->boolean()->label('Living with'),
            ])
            ->headerActions([CreateAction::make()])
            ->recordActions([EditAction::make(), DeleteAction::make()]);
    }
}
