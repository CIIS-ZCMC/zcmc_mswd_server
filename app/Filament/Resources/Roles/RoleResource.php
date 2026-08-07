<?php

namespace App\Filament\Resources\Roles;

use App\Filament\Resources\Roles\Pages\CreateRole;
use App\Filament\Resources\Roles\Pages\EditRole;
use App\Filament\Resources\Roles\Pages\ListRoles;
use App\Models\Role;
use BackedEnum;
use Database\Seeders\RolesAndPermissionsSeeder;
use Filament\Forms\Components\CheckboxList;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class RoleResource extends Resource
{
    protected static ?string $model = Role::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedShieldCheck;

    protected static string|null|\UnitEnum $navigationGroup = 'Access Control';

    protected static ?int $navigationSort = 1;

    protected static ?string $recordTitleAttribute = 'name';

    /**
     * Core roles are defined in code (the seeder) and back the app's defaults —
     * they may have their permissions tuned but cannot be renamed or deleted.
     */
    public static function isCore(?Role $role): bool
    {
        return $role !== null && array_key_exists($role->name, RolesAndPermissionsSeeder::ROLES);
    }

    public static function isSuperAdmin(?Role $role): bool
    {
        return $role !== null && $role->name === RolesAndPermissionsSeeder::SUPER_ADMIN;
    }

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required()
                    ->maxLength(255)
                    ->unique(ignoreRecord: true)
                    // Core role names are code-defined and must stay stable.
                    ->disabled(fn (?Role $record): bool => self::isCore($record))
                    ->dehydrated(fn (?Role $record): bool => ! self::isCore($record)),
                Textarea::make('description')
                    ->maxLength(255)
                    ->rows(2)
                    ->columnSpanFull(),
                CheckboxList::make('permissions')
                    ->relationship('permissions', 'name')
                    ->searchable()
                    ->bulkToggleable()
                    ->columns(3)
                    ->columnSpanFull()
                    // The super admin implicitly holds every ability via Gate::before.
                    ->disabled(fn (?Role $record): bool => self::isSuperAdmin($record))
                    ->helperText('Permissions granted to everyone assigned this role.'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('description')
                    ->toggleable()
                    ->limit(50)
                    ->placeholder('—'),
                TextColumn::make('permissions_count')
                    ->counts('permissions')
                    ->label('Permissions')
                    ->badge()
                    ->sortable(),
                IconColumn::make('core')
                    ->label('Core')
                    ->boolean()
                    ->state(fn (Role $record): bool => self::isCore($record))
                    ->tooltip('Core roles are code-defined and cannot be renamed or deleted.'),
            ])
            ->defaultSort('name');
    }

    public static function getPages(): array
    {
        return [
            'index' => ListRoles::route('/'),
            'create' => CreateRole::route('/create'),
            'edit' => EditRole::route('/{record}/edit'),
        ];
    }

    public static function canViewAny(): bool
    {
        return auth()->user()?->can('roles.manage') ?? false;
    }

    public static function canCreate(): bool
    {
        return auth()->user()?->can('roles.manage') ?? false;
    }

    public static function canEdit($record): bool
    {
        return auth()->user()?->can('roles.manage') ?? false;
    }

    // Core roles are protected; only custom roles may be deleted.
    public static function canDelete($record): bool
    {
        return (auth()->user()?->can('roles.manage') ?? false) && ! self::isCore($record);
    }
}
