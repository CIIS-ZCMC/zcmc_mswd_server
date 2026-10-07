<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LibraryPageController extends Controller
{
    /**
     * Render the library settings management page.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('Library/Index');
    }
}
