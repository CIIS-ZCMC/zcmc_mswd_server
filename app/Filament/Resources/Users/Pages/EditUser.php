<?php

namespace App\Filament\Resources\Users\Pages;

use App\Filament\Resources\Users\UserResource;
use App\Models\User;
use Filament\Actions\ViewAction;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class EditUser extends EditRecord
{
    protected static string $resource = UserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            ViewAction::make(),
        ];
    }

    /**
     * `password` is not mass assignable, so a new one (only offered under
     * AUTH_PROVIDER=local, already hashed by the form) is written apart from
     * the rest and ends the user's other sign-ins.
     *
     * @param  array<string, mixed>  $data
     */
    protected function handleRecordUpdate(Model $record, array $data): Model
    {
        $password = $data['password'] ?? null;
        unset($data['password']);

        $record->update($data);

        if ($password !== null) {
            /** @var User $record */
            $this->resetPassword($record, $password);
        }

        return $record;
    }

    /**
     * Keep the denormalized `users.role` cache in step with the roles just synced.
     */
    protected function afterSave(): void
    {
        $this->record->syncRoleCache();
    }

    /**
     * Set the new password and sign the user out everywhere else: API tokens
     * and stored sessions. The editor's own session is kept, so resetting your
     * own password does not sign you out.
     */
    private function resetPassword(User $user, string $hashedPassword): void
    {
        $user->forceFill(['password' => $hashedPassword])->save();

        $user->tokens()->delete();

        if (config('session.driver') === 'database') {
            DB::connection(config('session.connection'))
                ->table(config('session.table', 'sessions'))
                ->where('user_id', $user->getKey())
                ->where('id', '!=', session()->getId())
                ->delete();
        }
    }
}
