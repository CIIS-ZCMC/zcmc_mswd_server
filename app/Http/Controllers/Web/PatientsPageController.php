<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PatientsPageController extends Controller
{
    /**
     * Render the patients index view.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('Patients/Index', [
            'initialPatientId' => $request->query('patientId'),
        ]);
    }

    /**
     * Render the patient detail view.
     */
    public function show(Request $request, string $patient): Response
    {
        return Inertia::render('Patients/Show', [
            'patientId' => $patient,
            'tab' => $request->query('tab'),
        ]);
    }
}
