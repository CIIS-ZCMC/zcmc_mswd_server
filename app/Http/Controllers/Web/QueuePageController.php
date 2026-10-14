<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class QueuePageController extends Controller
{
    /**
     * Render the live queue board view.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('Queue/Index');
    }
}
