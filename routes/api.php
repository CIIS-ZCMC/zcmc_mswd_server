<?php

use App\Http\Controllers\DocumentController;
use App\Http\Controllers\FinalizeIntakeSheetController;
use App\Http\Controllers\FindHospitalPatientController;
use App\Http\Controllers\FindPatientRegisterController;
use App\Http\Controllers\HospitalPatientController;
use App\Http\Controllers\IntakeSheetHistoryController;
use App\Http\Controllers\IntakeSheetPdfController;
use App\Http\Controllers\MatchIntakePatientsController;
use App\Http\Controllers\MergePatientController;
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
    Route::put('users/{user}/roles', SyncUserRolesController::class)
        ->middleware('permission:users.manage');

    // Roles & permissions
    Route::middleware('permission:roles.manage')->group(function () {
        Route::apiResource('roles', RoleController::class);
        Route::apiResource('permissions', PermissionController::class);
    });

    // Unified Intake Sheet (per-action permissions declared on the controller)
    Route::apiResource('intake-sheets', UnifiedIntakeSheetController::class)
        ->parameters(['intake-sheets' => 'intakeSheet']);
    Route::middleware('permission:intake.view')->group(function () {
        Route::post('intake-sheets/match-patients', MatchIntakePatientsController::class);
        Route::get('intake-sheets/{intakeSheet}/history', IntakeSheetHistoryController::class);
        Route::get('intake-sheets/{intakeSheet}/pdf', IntakeSheetPdfController::class);
    });
    Route::post('intake-sheets/{intakeSheet}/submit', SubmitIntakeSheetController::class)
        ->middleware('permission:intake.update');
    Route::post('intake-sheets/{intakeSheet}/finalize', FinalizeIntakeSheetController::class)
        ->middleware('permission:intake.finalize');

    // Patients (per-action permissions declared on the controller)
    Route::apiResource('patients', PatientController::class);
    Route::post('patients/{id}/restore', RestorePatientController::class)
        ->middleware('permission:patients.delete');

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
});
