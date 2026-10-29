<?php

namespace App\Http\Middleware;

use App\Services\IamAuthService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ends a session that IAM no longer vouches for, so a revoked person cannot
 * keep working on a cookie that outlives their token. Super admin sessions,
 * which did not come from IAM, pass straight through.
 */
class EnsureIamSessionIsLive
{
    public function __construct(private readonly IamAuthService $iam) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->hasSession() || ! $request->session()->has('iam_expires_at')) {
            return $next($request);
        }

        if ($this->iam->stillSignedIn($request)) {
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
