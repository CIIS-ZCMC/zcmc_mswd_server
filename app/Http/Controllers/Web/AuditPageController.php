<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditPageController extends Controller
{
    /**
     * Render the audit log view.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('Audit/Index');
    }
}
