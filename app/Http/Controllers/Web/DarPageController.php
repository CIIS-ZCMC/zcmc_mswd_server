<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DarPageController extends Controller
{
    /**
     * Render the Daily Accomplishment Report page.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('Dar/Index', [
            'today' => today()->toDateString(),
        ]);
    }
}
