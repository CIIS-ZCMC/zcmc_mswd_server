<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
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

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'synced_at' => 'datetime',
        ];
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
