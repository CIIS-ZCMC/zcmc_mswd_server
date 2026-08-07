<?php

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
});
