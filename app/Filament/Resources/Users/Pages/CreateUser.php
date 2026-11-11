<?php

namespace App\Filament\Resources\Users\Pages;

use App\Filament\Resources\Users\UserResource;
use App\Models\User;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Database\Eloquent\Model;

/**
 * Makes a password account. Only reachable under AUTH_PROVIDER=local
 * (UserResource::canCreate).
 */
class CreateUser extends CreateRecord
{
    protected static string $resource = UserResource::class;

    /**
     * `password` is not mass assignable, so it is set apart from the rest.
     * The form has already hashed it.
     *
     * @param  array<string, mixed>  $data
     */
    protected function handleRecordCreation(array $data): Model
    {
        $password = $data['password'];
        unset($data['password']);

        $user = new User($data);
        $user->forceFill(['password' => $password])->save();

        return $user;
    }

    /**
     * Keep the denormalized `users.role` cache in step with the roles just saved.
     */
    protected function afterCreate(): void
    {
        /** @var User $user */
        $user = $this->record;
        $user->syncRoleCache();
    }
}
