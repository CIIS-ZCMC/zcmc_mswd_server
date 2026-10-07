<?php

use App\Http\Controllers\Web\AuditPageController;
use App\Http\Controllers\Web\AuthController;
use App\Http\Controllers\Web\CasesPageController;
use App\Http\Controllers\Web\LibraryPageController;
use App\Http\Controllers\Web\PatientsPageController;
use App\Http\Controllers\Web\ReportsPageController;
use Illuminate\Support\Facades\Route;

// Guest Authentication
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
});

// Authenticated Application Routes
Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    // Patients
    Route::get('/', [PatientsPageController::class, 'index'])->name('patients.index');
    Route::get('/patients/{patient}', [PatientsPageController::class, 'show'])->name('patients.show');

    // Caseload & Cases
    Route::get('/caseload', [CasesPageController::class, 'caseload'])->name('cases.caseload');
    Route::get('/cases/{case}', [CasesPageController::class, 'show'])->name('cases.show');

    // Reports
    Route::get('/reports', [ReportsPageController::class, 'index'])->name('reports.index');
    Route::get('/reports/social-cases', [ReportsPageController::class, 'socialCases'])->name('reports.social-cases');

    // Audit Log
    Route::get('/audit', [AuditPageController::class, 'index'])->name('audit.index');

    // Library Settings
    Route::get('/library', [LibraryPageController::class, 'index'])
        ->middleware('permission:library.manage')
        ->name('library.index');
});
