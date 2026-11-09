<?php

namespace App\Http\Controllers\Web;

use App\Exceptions\UmisSignInException;
use App\Http\Controllers\Controller;
use App\Services\UmisAuthService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class UmisAuthController extends Controller
{
    public function __construct(private readonly UmisAuthService $umis) {}

    /**
     * The ZCMC Portal's hand-off: swap the session id for the person, then send
     * them on to a clean URL, so the id does not stay in the address bar.
     */
    public function callback(Request $request, string $sessionId): RedirectResponse
    {
        try {
            $this->umis->signIn($request, $sessionId);
        } catch (UmisSignInException $e) {
            return redirect()->route('login')->with('auth_error', $e->getMessage());
        }

        return redirect()->intended('/');
    }
}
