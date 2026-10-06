<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CasesPageController extends Controller
{
    /**
     * Render the caseload view.
     */
    public function caseload(Request $request): Response
    {
        return Inertia::render('Cases/Caseload');
    }

    /**
     * Render the case detail view.
     */
    public function show(Request $request, string $case): Response
    {
        return Inertia::render('Cases/Show', [
            'caseId' => $case,
            'tab' => $request->query('tab'),
        ]);
    }
}
