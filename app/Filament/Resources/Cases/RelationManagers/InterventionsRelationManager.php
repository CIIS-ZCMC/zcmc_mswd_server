<?php

namespace App\Filament\Resources\Cases\RelationManagers;

use App\Models\InterventionType;
use Filament\Actions\CreateAction;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Hidden;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;

class InterventionsRelationManager extends RelationManager
{
    protected static string $relationship = 'interventions';

    protected static ?string $title = 'Interventions';

    /**
     * Keep the manager editable on the case View page (Filament makes relation
     * managers read-only there by default).
     */
    public function isReadOnly(): bool
    {
        return false;
    }

    public function canCreate(): bool
    {
        return auth()->user()?->can('cases.update') ?? false;
    }

    public function canEdit(Model $record): bool
    {
        return auth()->user()?->can('cases.update') ?? false;
    }

    public function canDelete(Model $record): bool
    {
        return auth()->user()?->can('cases.update') ?? false;
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Hidden::make('created_by')->default(fn () => auth()->id()),
            Select::make('intervention_type_id')
                ->label('Type')
                ->options(fn () => InterventionType::orderBy('name')->pluck('name', 'id'))
                ->searchable()
                ->required(),
            DatePicker::make('date_given')->default(now())->required(),
            Textarea::make('description')->columnSpanFull(),
            Textarea::make('outcome')->columnSpanFull(),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('interventionType.name')->label('Type'),
                TextColumn::make('date_given')->date()->sortable(),
                TextColumn::make('description')->limit(50)->placeholder('—'),
                TextColumn::make('outcome')->limit(50)->placeholder('—'),
            ])
            ->defaultSort('date_given', 'desc')
            ->headerActions([
                CreateAction::make(),
            ])
            ->recordActions([
                EditAction::make(),
                DeleteAction::make(),
            ]);
    }
}
