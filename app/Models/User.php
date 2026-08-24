<?php

namespace App\Models;

use Filament\Models\Contracts\FilamentUser;
use Filament\Models\Contracts\HasName;
use Filament\Panel;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements FilamentUser, HasName
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    /**
     * UMIS user id — not auto-increment.
     */
    // public $incrementing = false;

    // protected $keyType = 'int';

    protected $fillable = [
        'employee_id',
        'employee_number',
        'employee_name',
        'email',
        'role',
        'is_active',
        'synced_at',
    ];

    /**
     * Never serialize the credential columns — `/api/user` returns the raw
     * model, so anything not hidden here goes over the wire.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'synced_at' => 'datetime',
        ];
    }

    /**
     * Gate access to the Filament admin panel: active users holding the
     * `panel.access` permission (via any assigned role).
     */
    public function canAccessPanel(Panel $panel): bool
    {
        return $this->is_active && $this->can('panel.access');
    }

    /**
     * Name shown in the Filament panel (user menu, etc.).
     */
    public function getFilamentName(): string
    {
        return $this->employee_name ?? (string) $this->email;
    }

    /**
     * Refresh the denormalized `role` cache from the user's assigned roles.
     *
     * The `role` column is a display/filter cache only — the source of truth
     * is the Spatie role tables. Call this after assigning or syncing roles.
     */
    public function syncRoleCache(): void
    {
        $this->forceFill([
            'role' => $this->roles()->pluck('name')->first(),
        ])->save();
    }
}
