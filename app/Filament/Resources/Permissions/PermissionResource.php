<?php

namespace App\Filament\Resources\Permissions;

use App\Filament\Resources\Permissions\Pages\CreatePermission;
use App\Filament\Resources\Permissions\Pages\EditPermission;
use App\Filament\Resources\Permissions\Pages\ListPermissions;
use BackedEnum;
use Database\Seeders\RolesAndPermissionsSeeder;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Spatie\Permission\Models\Permission;

class PermissionResource extends Resource
{
    protected static ?string $model = Permission::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedKey;

    protected static string|null|\UnitEnum $navigationGroup = 'Access Control';

    protected static ?int $navigationSort = 3;

    protected static ?string $recordTitleAttribute = 'name';

    /**
     * Core permissions come from the seeder catalog and back the API
     * `permission:` middleware — they must not be renamed or deleted here.
     */
    public static function isCore(?Permission $permission): bool
    {
        return $permission !== null
            && in_array($permission->name, RolesAndPermissionsSeeder::PERMISSIONS, true);
    }

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required()
                    ->maxLength(255)
                    ->unique(ignoreRecord: true)
                    ->helperText('Use the resource.action convention, e.g. reports.export.'),
                TextInput::make('guard_name')
                    ->default(config('auth.defaults.guard'))
                    ->readOnly()
                    ->dehydrated(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('guard_name')
                    ->badge()
                    ->sortable(),
                IconColumn::make('core')
                    ->label('Core')
                    ->boolean()
                    ->state(fn (Permission $record): bool => self::isCore($record))
                    ->tooltip('Core permissions are defined in code and cannot be edited or deleted.'),
                TextColumn::make('roles_count')
                    ->counts('roles')
                    ->label('Roles')
                    ->sortable(),
            ])
            ->defaultSort('name');
    }

    public static function getPages(): array
    {
        return [
            'index' => ListPermissions::route('/'),
            'create' => CreatePermission::route('/create'),
            'edit' => EditPermission::route('/{record}/edit'),
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

    // Core catalog permissions are code-defined; only custom ones are editable.
    public static function canEdit($record): bool
    {
        return (auth()->user()?->can('roles.manage') ?? false) && ! self::isCore($record);
    }

    public static function canDelete($record): bool
    {
        return (auth()->user()?->can('roles.manage') ?? false) && ! self::isCore($record);
    }
}
