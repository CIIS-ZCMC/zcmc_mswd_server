<?php

namespace App\Filament\Resources\DocumentTypes;

use App\Filament\Concerns\ManagesSoftDeletedLookups;
use App\Filament\Resources\DocumentTypes\Pages\CreateDocumentType;
use App\Filament\Resources\DocumentTypes\Pages\EditDocumentType;
use App\Filament\Resources\DocumentTypes\Pages\ListDocumentTypes;
use App\Models\DocumentType;
use BackedEnum;
use Filament\Actions\EditAction;
use Filament\Actions\RestoreAction;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;
use Illuminate\Validation\Rules\Unique;

/**
 * The kinds of patient document picked on upload. Retire one with "Active" off rather
 * than deleting it: documents already filed under it keep their type's name.
 */
class DocumentTypeResource extends Resource
{
    use ManagesSoftDeletedLookups;

    protected static ?string $model = DocumentType::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedDocumentText;

    protected static string|null|\UnitEnum $navigationGroup = 'Reference Data';

    protected static ?int $navigationSort = 7;

    protected static ?string $recordTitleAttribute = 'name';

    protected static ?string $modelLabel = 'document type';

    protected static ?string $pluralModelLabel = 'document types';

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required()
                    ->maxLength(255)
                    ->unique(ignoreRecord: true, modifyRuleUsing: fn (Unique $rule) => $rule->whereNull('deleted_at')),
                TextInput::make('sort_order')
                    ->numeric()
                    ->minValue(0)
                    ->maxValue(65535)
                    ->default(0),
                Toggle::make('is_active')
                    ->label('Active')
                    ->default(true),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('sort_order')
                    ->label('Order')
                    ->sortable(),
                IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean(),
            ])
            ->filters([
                TrashedFilter::make(),
            ])
            ->recordActions([
                EditAction::make(),
                RestoreAction::make(),
            ])
            ->defaultSort('sort_order');
    }

    public static function getPages(): array
    {
        return [
            'index' => ListDocumentTypes::route('/'),
            'create' => CreateDocumentType::route('/create'),
            'edit' => EditDocumentType::route('/{record}/edit'),
        ];
    }

    public static function canViewAny(): bool
    {
        return auth()->user()?->can('settings.manage') ?? false;
    }

    public static function canCreate(): bool
    {
        return auth()->user()?->can('settings.manage') ?? false;
    }

    public static function canEdit($record): bool
    {
        return auth()->user()?->can('settings.manage') ?? false;
    }

    public static function canRestore($record): bool
    {
        return auth()->user()?->can('settings.manage') ?? false;
    }

    public static function canDelete($record): bool
    {
        return auth()->user()?->can('settings.manage') ?? false;
    }
}
