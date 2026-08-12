<?php

namespace App\Filament\Resources\Patients\RelationManagers;

use App\Models\User;
use Filament\Actions\CreateAction;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Toggle;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class CaretakersRelationManager extends RelationManager
{
    protected static string $relationship = 'caretakers';

    protected static ?string $title = 'Assigned staff';

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Select::make('user_id')
                ->label('Staff')
                ->options(fn () => User::orderBy('employee_name')->pluck('employee_name', 'id'))
                ->searchable()
                ->required(),
            Select::make('role')
                ->options(['social_worker' => 'Social worker', 'case_manager' => 'Case manager', 'nurse' => 'Nurse', 'counselor' => 'Counselor', 'others' => 'Others'])
                ->required(),
            DateTimePicker::make('assigned_date')->default(now())->required(),
            DateTimePicker::make('unassigned_date'),
            Toggle::make('is_active')->default(true),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('user.employee_name')->label('Staff')->searchable(),
                TextColumn::make('role')->badge(),
                TextColumn::make('assigned_date')->date(),
                IconColumn::make('is_active')->boolean(),
            ])
            ->headerActions([CreateAction::make()->label('Assign staff')])
            ->recordActions([EditAction::make(), DeleteAction::make()]);
    }
}
