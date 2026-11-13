<?php

namespace App\Filament\Resources\Users;

use App\Enums\AuthProvider;
use App\Filament\Resources\Users\Pages\CreateUser;
use App\Filament\Resources\Users\Pages\EditUser;
use App\Filament\Resources\Users\Pages\ListUsers;
use App\Filament\Resources\Users\Pages\ViewUser;
use App\Models\User;
use BackedEnum;
use Filament\Actions\EditAction;
use Filament\Actions\ViewAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use SensitiveParameter;

class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedUsers;

    protected static string|null|\UnitEnum $navigationGroup = 'Access Control';

    protected static ?int $navigationSort = 2;

    protected static ?string $recordTitleAttribute = 'employee_name';

    public static function form(Schema $schema): Schema
    {
        // Under UMIS or IAM, identity comes from the provider and is read-only
        // here. Under AUTH_PROVIDER=local this server is the only source, so
        // the Super Admin enters it and sets the password.
        $local = AuthProvider::isLocal();

        return $schema
            ->components([
                TextInput::make('employee_name')
                    ->label('Name')
                    ->required($local)
                    ->maxLength(255)
                    ->disabled(! $local)
                    ->dehydrated($local),
                // The password sign-in key, so it must be unique (the column is not).
                TextInput::make('employee_number')
                    ->required($local)
                    ->integer()
                    ->minValue(1)
                    ->unique(ignoreRecord: true)
                    ->disabled(! $local)
                    ->dehydrated($local),
                TextInput::make('email')
                    ->email()
                    ->required($local)
                    ->maxLength(255)
                    ->disabled(! $local)
                    ->dehydrated($local),
                // Hashed here; the pages write it with forceFill, since
                // `password` is deliberately not mass assignable. Blank on edit
                // keeps the current password.
                TextInput::make('password')
                    ->label(fn (string $operation): string => $operation === 'create' ? 'Password' : 'New password')
                    ->password()
                    ->revealable()
                    ->autocomplete('new-password')
                    ->required(fn (string $operation): bool => $operation === 'create')
                    ->rule(Password::default())
                    ->dehydrated(fn (#[SensitiveParameter] ?string $state): bool => filled($state))
                    ->dehydrateStateUsing(fn (#[SensitiveParameter] string $state): string => Hash::make($state))
                    ->same('password_confirmation')
                    ->live(debounce: 500)
                    ->helperText(fn (string $operation): ?string => $operation === 'edit'
                        ? 'Leave blank to keep the current password. Setting one signs the user out everywhere.'
                        : null)
                    ->visible(fn (string $operation): bool => $local && $operation !== 'view'),
                TextInput::make('password_confirmation')
                    ->label('Confirm password')
                    ->password()
                    ->revealable()
                    ->autocomplete('new-password')
                    ->required()
                    ->dehydrated(false)
                    ->visible(fn (string $operation, Get $get): bool => $local
                        && $operation !== 'view'
                        && filled($get('password'))),
                // MSWD-maintained: printed under the worker's name on MSWD forms.
                TextInput::make('license_no')
                    ->label('License No.')
                    ->maxLength(255),
                TextInput::make('position')
                    ->placeholder('e.g. Social Welfare Officer II')
                    ->maxLength(255),
                Select::make('roles')
                    ->relationship('roles', 'name')
                    ->multiple()
                    ->preload()
                    ->searchable()
                    ->helperText('Assigning roles here drives both API and panel permissions.'),
                Toggle::make('is_active'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('employee_name')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('employee_number')
                    ->searchable(),
                TextColumn::make('email')
                    ->searchable()
                    ->toggleable(),
                TextColumn::make('roles.name')
                    ->badge()
                    ->label('Roles'),
                IconColumn::make('is_active')
                    ->boolean()
                    ->sortable(),
                TextColumn::make('synced_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('roles')
                    ->relationship('roles', 'name')
                    ->multiple()
                    ->preload(),
                TernaryFilter::make('is_active'),
            ])
            ->recordActions([
                ViewAction::make(),
                EditAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListUsers::route('/'),
            'create' => CreateUser::route('/create'),
            'view' => ViewUser::route('/{record}'),
            'edit' => EditUser::route('/{record}/edit'),
        ];
    }

    public static function canViewAny(): bool
    {
        return auth()->user()?->can('users.view') ?? false;
    }

    public static function canView($record): bool
    {
        return auth()->user()?->can('users.view') ?? false;
    }

    public static function canEdit($record): bool
    {
        return auth()->user()?->can('users.manage') ?? false;
    }

    // Under UMIS or IAM, users are provisioned on sign-in, never created here.
    // Under AUTH_PROVIDER=local this is the only way to make an account.
    // Nobody is ever deleted; deactivate with `is_active` instead.
    public static function canCreate(): bool
    {
        return AuthProvider::isLocal()
            && (auth()->user()?->can('users.manage') ?? false);
    }

    public static function canDelete($record): bool
    {
        return false;
    }

    public static function canDeleteAny(): bool
    {
        return false;
    }
}
