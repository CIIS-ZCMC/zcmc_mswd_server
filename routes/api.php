<?php

use App\Http\Controllers\ApproveAssistanceController;
use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\AssignCaseController;
use App\Http\Controllers\AssistanceHistoryController;
use App\Http\Controllers\CancelAssistanceController;
use App\Http\Controllers\CaseActivitiesController;
use App\Http\Controllers\CaseDocumentController;
use App\Http\Controllers\CaseHistoryController;
use App\Http\Controllers\CaseModelController;
use App\Http\Controllers\CaseProfileController;
use App\Http\Controllers\CloseCaseController;
use App\Http\Controllers\DiagnosticController;
use App\Http\Controllers\DiagnosticReportController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\FinalizeIntakeSheetController;
use App\Http\Controllers\FindHospitalPatientController;
use App\Http\Controllers\FindPatientRegisterController;
use App\Http\Controllers\HospitalPatientController;
use App\Http\Controllers\IntakeSheetHistoryController;
use App\Http\Controllers\IntakeSheetPdfController;
use App\Http\Controllers\InterventionController;
use App\Http\Controllers\MatchIntakePatientsController;
use App\Http\Controllers\MergePatientController;
use App\Http\Controllers\PatientAssistanceController;
use App\Http\Controllers\PatientAssistanceLogController;
use App\Http\Controllers\PatientAssistanceReportController;
use App\Http\Controllers\PatientCaretakerController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\PatientDuplicatesController;
use App\Http\Controllers\PatientFamilyMemberController;
use App\Http\Controllers\PatientHistoryController;
use App\Http\Controllers\PatientIdController;
use App\Http\Controllers\PatientMergesController;
use App\Http\Controllers\PatientProfileController;
use App\Http\Controllers\PatientRegisterController;
use App\Http\Controllers\PatientWatcherController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\ReferCaseController;
use App\Http\Controllers\ReleaseAssistanceController;
use App\Http\Controllers\ReopenCaseController;
use App\Http\Controllers\RestoreCaseController;
use App\Http\Controllers\RestorePatientController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SubmitIntakeSheetController;
use App\Http\Controllers\SyncUserRolesController;
use App\Http\Controllers\UnassignCaretakerController;
use App\Http\Controllers\UnifiedIntakeSheetController;
use App\Http\Controllers\UnmergePatientController;
use App\Http\Controllers\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', fn (Request $request) => $request->user())->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {
    // Users (read-only) + role assignment
    Route::apiResource('users', UserController::class)->only(['index', 'show']);
    Route::put('users/{user}/roles', SyncUserRolesController::class)->middleware('permission:users.manage');

    // Roles & permissions
    Route::middleware('permission:roles.manage')->group(function () {
        Route::apiResource('roles', RoleController::class);
        Route::apiResource('permissions', PermissionController::class);
    });

    // Unified Intake Sheet (per-action permissions declared on the controller)
    Route::apiResource('intake-sheets', UnifiedIntakeSheetController::class)->parameters(['intake-sheets' => 'intakeSheet']);

    Route::middleware('permission:intake.view')->group(function () {
        Route::post('intake-sheets/match-patients', MatchIntakePatientsController::class);
        Route::get('intake-sheets/{intakeSheet}/history', IntakeSheetHistoryController::class);
        Route::get('intake-sheets/{intakeSheet}/pdf', IntakeSheetPdfController::class);
    });

    Route::post('intake-sheets/{intakeSheet}/submit', SubmitIntakeSheetController::class)->middleware('permission:intake.update');
    Route::post('intake-sheets/{intakeSheet}/finalize', FinalizeIntakeSheetController::class)->middleware('permission:intake.finalize');

    // Patients (per-action permissions declared on the controller)
    Route::apiResource('patients', PatientController::class);
    Route::post('patients/{id}/restore', RestorePatientController::class)->middleware('permission:patients.delete');

    Route::middleware('permission:patients.merge')->group(function () {
        Route::post('patients/{patient}/merge', MergePatientController::class);
        Route::post('patients/{patient}/unmerge', UnmergePatientController::class);
    });

    Route::middleware('permission:patients.view')->group(function () {
        Route::get('patients/{patient}/profile', PatientProfileController::class);
        Route::get('patients/{patient}/history', PatientHistoryController::class);
        Route::get('patients/{patient}/duplicates', PatientDuplicatesController::class);
        Route::get('patients/{patient}/merges', PatientMergesController::class);
        Route::get('patients/{patient}/ids', [PatientIdController::class, 'index']);
        Route::get('patients/{patient}/family-members', [PatientFamilyMemberController::class, 'index']);
        Route::get('patients/{patient}/watchers', [PatientWatcherController::class, 'index']);
        Route::get('patients/{patient}/caretakers', [PatientCaretakerController::class, 'index']);
        Route::get('patients/{patient}/documents', [DocumentController::class, 'index']);

        // Hospital (SQL Server) lookups — read-only. `find` before `{id}` so it is not shadowed.
        Route::get('hospital-patients', [HospitalPatientController::class, 'index']);
        Route::get('hospital-patients/find', FindHospitalPatientController::class);
        Route::get('hospital-patients/{id}', [HospitalPatientController::class, 'show']);
        Route::get('patient-registers', [PatientRegisterController::class, 'index']);
        Route::get('patient-registers/find', FindPatientRegisterController::class);
        Route::get('patient-registers/{id}', [PatientRegisterController::class, 'show']);
    });

    // Patient records
    Route::middleware('permission:patients.update')->group(function () {
        Route::post('patients/{patient}/ids', [PatientIdController::class, 'store']);
        Route::put('patient-ids/{patientId}', [PatientIdController::class, 'update']);
        Route::delete('patient-ids/{patientId}', [PatientIdController::class, 'destroy']);

        Route::post('patients/{patient}/family-members', [PatientFamilyMemberController::class, 'store']);
        Route::put('family-members/{familyMember}', [PatientFamilyMemberController::class, 'update']);
        Route::delete('family-members/{familyMember}', [PatientFamilyMemberController::class, 'destroy']);

        Route::post('patients/{patient}/watchers', [PatientWatcherController::class, 'store']);
        Route::put('watchers/{watcher}', [PatientWatcherController::class, 'update']);
        Route::delete('watchers/{watcher}', [PatientWatcherController::class, 'destroy']);

        Route::post('patients/{patient}/caretakers', [PatientCaretakerController::class, 'store']);
        Route::patch('caretakers/{caretaker}/unassign', UnassignCaretakerController::class);

        Route::post('patients/{patient}/documents', [DocumentController::class, 'store']);
        Route::delete('documents/{document}', [DocumentController::class, 'destroy']);
    });

    // Case management (per-action permissions declared on the controller)
    Route::apiResource('cases', CaseModelController::class);
    Route::post('cases/{id}/restore', RestoreCaseController::class)->middleware('permission:cases.delete');

    Route::middleware('permission:cases.view')->group(function () {
        Route::get('cases/{case}/profile', CaseProfileController::class);
        Route::get('cases/{case}/history', CaseHistoryController::class);
        Route::get('cases/{case}/activities', CaseActivitiesController::class);
    });

    Route::middleware('permission:cases.update')->group(function () {
        Route::post('cases/{case}/assign', AssignCaseController::class);
        Route::post('cases/{case}/close', CloseCaseController::class);
        Route::post('cases/{case}/refer', ReferCaseController::class);
        Route::post('cases/{case}/reopen', ReopenCaseController::class);
    });

    // Case clinical records (per-action permissions declared on the controllers)
    Route::get('cases/{case}/assessments', [AssessmentController::class, 'index']);
    Route::post('cases/{case}/assessments', [AssessmentController::class, 'store']);
    Route::put('assessments/{assessment}', [AssessmentController::class, 'update']);
    Route::delete('assessments/{assessment}', [AssessmentController::class, 'destroy']);

    Route::get('cases/{case}/diagnostics', [DiagnosticController::class, 'index']);
    Route::post('cases/{case}/diagnostics', [DiagnosticController::class, 'store']);
    Route::put('diagnostics/{diagnostic}', [DiagnosticController::class, 'update']);
    Route::delete('diagnostics/{diagnostic}', [DiagnosticController::class, 'destroy']);
    Route::get('diagnostics/{diagnostic}/reports', [DiagnosticReportController::class, 'index']);
    Route::post('diagnostics/{diagnostic}/reports', [DiagnosticReportController::class, 'store']);
    Route::delete('diagnostic-reports/{diagnosticReport}', [DiagnosticReportController::class, 'destroy']);

    Route::get('cases/{case}/interventions', [InterventionController::class, 'index']);
    Route::post('cases/{case}/interventions', [InterventionController::class, 'store']);
    Route::put('interventions/{intervention}', [InterventionController::class, 'update']);
    Route::delete('interventions/{intervention}', [InterventionController::class, 'destroy']);

    Route::get('cases/{case}/documents', [CaseDocumentController::class, 'index']);
    Route::post('cases/{case}/documents', [CaseDocumentController::class, 'store']);
    Route::delete('cases/{case}/documents/{document}', [CaseDocumentController::class, 'destroy']);

    // Patient assistance (case-scoped financial aid; per-action permissions on controllers)
    Route::get('cases/{case}/assistances', [PatientAssistanceController::class, 'index']);
    Route::post('cases/{case}/assistances', [PatientAssistanceController::class, 'store']);
    Route::get('assistances/{assistance}', [PatientAssistanceController::class, 'show']);
    Route::put('assistances/{assistance}', [PatientAssistanceController::class, 'update']);
    Route::delete('assistances/{assistance}', [PatientAssistanceController::class, 'destroy']);

    Route::get('assistances/{assistance}/history', AssistanceHistoryController::class)->middleware('permission:assistance.view');
    Route::get('assistances/{assistance}/logs', [PatientAssistanceLogController::class, 'index']);

    // Lifecycle transitions (each writes a log entry)
    Route::post('assistances/{assistance}/approve', ApproveAssistanceController::class)->middleware('permission:assistance.approve');
    Route::post('assistances/{assistance}/release', ReleaseAssistanceController::class)->middleware('permission:assistance.approve');
    Route::post('assistances/{assistance}/cancel', CancelAssistanceController::class)->middleware('permission:assistance.update');

    // Released-aid report snapshots
    Route::get('assistances/{assistance}/reports', [PatientAssistanceReportController::class, 'forAssistance']);
    Route::get('assistance-reports', [PatientAssistanceReportController::class, 'index']);
    Route::get('assistance-reports/{report}', [PatientAssistanceReportController::class, 'show']);
    Route::post('assistance-reports/{report}/void', [PatientAssistanceReportController::class, 'void']);
});
