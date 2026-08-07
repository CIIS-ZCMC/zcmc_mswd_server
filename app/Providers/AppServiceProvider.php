<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use RuntimeException;
use Spatie\Permission\Models\Role;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Hard guard: the Shield super-admin role can never be deleted, from
        // any surface (panel, API, tinker). A policy alone is insufficient
        // because the super-admin bypasses gates via Shield's Gate::before.
        Role::deleting(function (Role $role): void {
            if ($role->name === config('filament-shield.super_admin.name')) {
                throw new RuntimeException('The super administrator role cannot be deleted.');
            }
        });
    }
}
