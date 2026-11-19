<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApprovalsPageController extends Controller
{
    /**
     * Render the guarantees waiting for the Head's or Supervisor's sign-off.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('Approvals/Index');
    }
}
