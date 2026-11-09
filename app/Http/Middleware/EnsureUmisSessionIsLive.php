<?php

namespace App\Http\Middleware;

use App\Services\UmisAuthService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ends a session that UMIS no longer vouches for (the person signed out of the
 * ZCMC Portal, or lost MSWD access), so they cannot keep working on a cookie
 * that outlives their portal sign-in. Sessions that did not come from UMIS
 * pass straight through.
 */
class EnsureUmisSessionIsLive
{
    public function __construct(private readonly UmisAuthService $umis) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->umis->cameFromUmis($request)) {
            return $next($request);
        }

        if ($this->umis->stillSignedIn($request)) {
            return $next($request);
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Your session has ended. Please sign in again.'], 401);
        }

        return redirect()->route('login');
    }
}
