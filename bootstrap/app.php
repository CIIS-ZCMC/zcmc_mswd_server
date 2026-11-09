<?php

use App\Http\Middleware\EnsureAuthProvider;
use App\Http\Middleware\EnsureIamSessionIsLive;
use App\Http\Middleware\EnsureUmisSessionIsLive;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->web(append: [
            HandleInertiaRequests::class,
        ]);
        // Run after the session starts, on both the web and the cookie-session API.
        // Each passes straight through sessions its provider did not start, so
        // both stay registered whichever provider is switched on.
        $middleware->appendToGroup('web', EnsureIamSessionIsLive::class);
        $middleware->appendToGroup('api', EnsureIamSessionIsLive::class);
        $middleware->appendToGroup('web', EnsureUmisSessionIsLive::class);
        $middleware->appendToGroup('api', EnsureUmisSessionIsLive::class);
        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'auth.provider' => EnsureAuthProvider::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
