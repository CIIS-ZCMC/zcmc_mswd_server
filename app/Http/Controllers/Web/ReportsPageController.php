<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportsPageController extends Controller
{
    /**
     * Render the reports dashboard view.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('Reports/Index');
    }

    /**
     * Render the social cases report view.
     */
    public function socialCases(Request $request): Response
    {
        return Inertia::render('Reports/SocialCases');
    }
}
