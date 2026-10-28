<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PatientsPageController extends Controller
{
    /**
     * Render the patients index view.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        // `/` is the landing page: send a role without Patients to its first module.
        if (! $request->user()->can('patients.view')) {
            $landing = collect([
                'cases.view' => '/caseload',
                'queue.manage' => '/queue',
                'dar.manage' => '/dar',
                'reports.view' => '/reports/social-cases',
            ])->first(fn (string $url, string $permission) => $request->user()->can($permission));

            abort_if($landing === null, 403);

            return redirect($landing);
        }

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
