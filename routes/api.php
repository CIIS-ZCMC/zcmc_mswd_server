<?php

use App\Http\Controllers\DocumentController;
use App\Http\Controllers\PatientCaretakerController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\PatientFamilyMemberController;
use App\Http\Controllers\PatientIdController;
use App\Http\Controllers\PatientWatcherController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UnifiedIntakeSheetController;
use App\Http\Controllers\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {
    // User & role administration
    Route::middleware('permission:users.view')->group(function () {
        Route::get('users', [UserController::class, 'index']);
        Route::get('users/{user}', [UserController::class, 'show']);
    });

    Route::put('users/{user}/roles', [UserController::class, 'syncRoles'])
        ->middleware('permission:users.manage');

    // Role & permission management
    Route::middleware('permission:roles.manage')->group(function () {
        Route::apiResource('roles', RoleController::class);
        Route::apiResource('permissions', PermissionController::class);
    });

    // Unified Intake Sheet
    Route::prefix('intake-sheets')->group(function () {
        Route::get('/', [UnifiedIntakeSheetController::class, 'index'])
            ->middleware('permission:intake.view');
        Route::post('match-patients', [UnifiedIntakeSheetController::class, 'matchPatients'])
            ->middleware('permission:intake.view');
        Route::get('{intakeSheet}', [UnifiedIntakeSheetController::class, 'show'])
            ->middleware('permission:intake.view');
        Route::get('{intakeSheet}/history', [UnifiedIntakeSheetController::class, 'history'])
            ->middleware('permission:intake.view');
        Route::get('{intakeSheet}/pdf', [UnifiedIntakeSheetController::class, 'pdf'])
            ->middleware('permission:intake.view');
        Route::post('/', [UnifiedIntakeSheetController::class, 'store'])
            ->middleware('permission:intake.create');
        Route::put('{intakeSheet}', [UnifiedIntakeSheetController::class, 'update'])
            ->middleware('permission:intake.update');
        Route::post('{intakeSheet}/submit', [UnifiedIntakeSheetController::class, 'submit'])
            ->middleware('permission:intake.update');
        Route::post('{intakeSheet}/finalize', [UnifiedIntakeSheetController::class, 'finalize'])
            ->middleware('permission:intake.finalize');
        Route::delete('{intakeSheet}', [UnifiedIntakeSheetController::class, 'destroy'])
            ->middleware('permission:intake.delete');
    });

    // Patient management
    Route::middleware('permission:patients.view')->group(function () {
        Route::get('patients', [PatientController::class, 'index']);
        Route::get('patients/{patient}', [PatientController::class, 'show']);
        Route::get('patients/{patient}/profile', [PatientController::class, 'profile']);
        Route::get('patients/{patient}/history', [PatientController::class, 'history']);
        Route::get('patients/{patient}/ids', [PatientIdController::class, 'index']);
        Route::get('patients/{patient}/family-members', [PatientFamilyMemberController::class, 'index']);
        Route::get('patients/{patient}/watchers', [PatientWatcherController::class, 'index']);
        Route::get('patients/{patient}/caretakers', [PatientCaretakerController::class, 'index']);
        Route::get('patients/{patient}/documents', [DocumentController::class, 'index']);
        Route::get('patients/{patient}/duplicates', [PatientController::class, 'duplicates']);
        Route::get('patients/{patient}/merges', [PatientController::class, 'merges']);
    });

    Route::middleware('permission:patients.merge')->group(function () {
        Route::post('patients/{patient}/merge', [PatientController::class, 'merge']);
        Route::post('patients/{patient}/unmerge', [PatientController::class, 'unmerge']);
    });

    Route::post('patients', [PatientController::class, 'store'])
        ->middleware('permission:patients.create');

    Route::middleware('permission:patients.update')->group(function () {
        Route::put('patients/{patient}', [PatientController::class, 'update']);

        // Records
        Route::post('patients/{patient}/ids', [PatientIdController::class, 'store']);
        Route::put('patient-ids/{patientId}', [PatientIdController::class, 'update']);
        Route::delete('patient-ids/{patientId}', [PatientIdController::class, 'destroy']);

        Route::post('patients/{patient}/family-members', [PatientFamilyMemberController::class, 'store']);
        Route::put('family-members/{familyMember}', [PatientFamilyMemberController::class, 'update']);
        Route::delete('family-members/{familyMember}', [PatientFamilyMemberController::class, 'destroy']);

        Route::post('patients/{patient}/watchers', [PatientWatcherController::class, 'store']);
        Route::put('watchers/{watcher}', [PatientWatcherController::class, 'update']);
        Route::delete('watchers/{watcher}', [PatientWatcherController::class, 'destroy']);

        // Social-worker assignment
        Route::post('patients/{patient}/caretakers', [PatientCaretakerController::class, 'store']);
        Route::patch('caretakers/{caretaker}/unassign', [PatientCaretakerController::class, 'unassign']);

        // Documents (tied to one of the patient's cases)
        Route::post('patients/{patient}/documents', [DocumentController::class, 'store']);
        Route::delete('documents/{document}', [DocumentController::class, 'destroy']);
    });

    Route::delete('patients/{patient}', [PatientController::class, 'destroy'])
        ->middleware('permission:patients.delete');
    Route::post('patients/{id}/restore', [PatientController::class, 'restore'])
        ->middleware('permission:patients.delete');
});
