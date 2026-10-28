<?php

namespace App\Http\Controllers\Web;

use App\Exceptions\IamSignInException;
use App\Http\Controllers\Controller;
use App\Services\IamAuthService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class IamAuthController extends Controller
{
    public function __construct(private readonly IamAuthService $iam) {}

    /**
     * Send the browser to ZCMC IAM. Reached by a plain link, not an Inertia
     * visit: leaving the application is a real navigation, and an XHR would
     * die on CORS following this redirect.
     */
    public function redirect(Request $request): RedirectResponse
    {
        return redirect()->away($this->iam->authorizationUrl($request));
    }

    /**
     * IAM's answer: swap the code for tokens, then log the person in.
     */
    public function callback(Request $request): RedirectResponse
    {
        try {
            $this->iam->signIn($request);
        } catch (IamSignInException $e) {
            return redirect()->route('login')->with('iam_error', $e->getMessage());
        }

        return redirect()->intended('/');
    }
}
