<?php

namespace App\Filament\Resources\Signatories;

use App\Filament\Concerns\ManagesSoftDeletedLookups;
use App\Filament\Resources\Signatories\Pages\CreateSignatory;
use App\Filament\Resources\Signatories\Pages\EditSignatory;
use App\Filament\Resources\Signatories\Pages\ListSignatories;
use App\Models\Signatory;
use BackedEnum;
use Closure;
use Filament\Actions\EditAction;
use Filament\Actions\RestoreAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;

/**
 * Officers printed on MSWD forms (e.g. the Acknowledgement Slip's approver). One
 * active signatory per role; deactivate the outgoing officer before activating the
 * new one, the same rule the API enforces.
 */
class SignatoryResource extends Resource
{
    use ManagesSoftDeletedLookups;

    protected static ?string $model = Signatory::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedPencilSquare;

    protected static string|null|\UnitEnum $navigationGroup = 'Reference Data';

    protected static ?int $navigationSort = 6;

    protected static ?string $recordTitleAttribute = 'name';

    protected static ?string $pluralModelLabel = 'signatories';

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required()
                    ->maxLength(255),
                Textarea::make('title')
                    ->rows(2)
                    ->maxLength(1000)
                    ->helperText('Printed under the name. Line breaks are kept.'),
                Select::make('role')
                    ->options(Signatory::ROLES)
                    ->required(),
                Toggle::make('is_active')
                    ->label('Active')
                    ->default(true)
                    ->rule(fn (Get $get, ?Signatory $record) => function (string $attribute, mixed $value, Closure $fail) use ($get, $record) {
                        if (! $value) {
                            return;
                        }

                        $taken = Signatory::query()
                            ->where('role', $get('role'))
                            ->where('is_active', true)
                            ->when($record, fn ($query) => $query->whereKeyNot($record->getKey()))
                            ->exists();

                        if ($taken) {
                            $fail('Another signatory is already active for this role. Deactivate them first.');
                        }
                    }),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('title')
                    ->wrap()
                    ->placeholder('—'),
                TextColumn::make('role')
                    ->formatStateUsing(fn (string $state) => Signatory::ROLES[$state] ?? $state),
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
            ->defaultSort('name');
    }

    public static function getPages(): array
    {
        return [
            'index' => ListSignatories::route('/'),
            'create' => CreateSignatory::route('/create'),
            'edit' => EditSignatory::route('/{record}/edit'),
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
