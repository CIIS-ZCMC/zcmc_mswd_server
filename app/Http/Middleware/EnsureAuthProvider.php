<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Hides a sign-in provider's routes unless it is the one in use
 * (`services.auth_provider`), so a switched-off provider cannot be reached
 * by typing its URL.
 */
class EnsureAuthProvider
{
    public function handle(Request $request, Closure $next, string $provider): Response
    {
        abort_unless(config('services.auth_provider') === $provider, 404);

        return $next($request);
    }
}
