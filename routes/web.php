<?php

use App\Http\Controllers\Web\AuditPageController;
use App\Http\Controllers\Web\AuthController;
use App\Http\Controllers\Web\CasesPageController;
use App\Http\Controllers\Web\DarPageController;
use App\Http\Controllers\Web\IamAuthController;
use App\Http\Controllers\Web\LibraryPageController;
use App\Http\Controllers\Web\PatientsPageController;
use App\Http\Controllers\Web\QueuePageController;
use App\Http\Controllers\Web\ReportsPageController;
use App\Http\Controllers\Web\UmisAuthController;
use Illuminate\Support\Facades\Route;

// Guest Authentication
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    // Password sign-in: the local super admin, or any role under AUTH_PROVIDER=local.
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');

    // ZCMC IAM sign-in, only while AUTH_PROVIDER=iam (404 otherwise).
    // /callback is the redirect URI registered with IAM.
    Route::middleware('auth.provider:iam')->group(function () {
        Route::get('/auth/iam/redirect', [IamAuthController::class, 'redirect'])->name('iam.redirect');
        Route::get('/callback', [IamAuthController::class, 'callback'])->name('iam.callback');
    });
});

// UMIS hand-off from the ZCMC Portal, only while AUTH_PROVIDER=umis (404 otherwise).
// Not guest-only: on a shared terminal whoever is signed in is signed out first.
// The path is fixed by UMIS ({system domain}/signing-in/{session_id}).
Route::get('/signing-in/{sessionId}', [UmisAuthController::class, 'callback'])
    ->whereUuid('sessionId')
    ->middleware(['auth.provider:umis', 'throttle:20,1'])
    ->name('umis.callback');

// Authenticated Application Routes
Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    // Patients
    Route::get('/', [PatientsPageController::class, 'index'])->name('patients.index');
    Route::get('/patients/{patient}', [PatientsPageController::class, 'show'])
        ->middleware('permission:patients.view')
        ->name('patients.show');

    // Caseload & Cases
    Route::get('/caseload', [CasesPageController::class, 'caseload'])
        ->middleware('permission:cases.view')
        ->name('cases.caseload');
    Route::get('/cases/{case}', [CasesPageController::class, 'show'])
        ->middleware('permission:cases.view')
        ->name('cases.show');

    // Daily Accomplishment Report (DAR)
    Route::get('/dar', [DarPageController::class, 'index'])
        ->middleware('permission:dar.manage')
        ->name('dar.index');

    // Turnaround Time Queue Board
    Route::get('/queue', [QueuePageController::class, 'index'])
        ->middleware('permission:queue.manage')
        ->name('queue.index');

    // Reports
    Route::get('/reports', [ReportsPageController::class, 'index'])
        ->middleware('permission:reports.view')
        ->name('reports.index');
    Route::get('/reports/social-cases', [ReportsPageController::class, 'socialCases'])
        ->middleware('permission:reports.view')
        ->name('reports.social-cases');
    Route::get('/reports/turnaround', [ReportsPageController::class, 'turnaround'])
        ->middleware('permission:reports.view')
        ->name('reports.turnaround');

    // Audit Log
    Route::get('/audit', [AuditPageController::class, 'index'])
        ->middleware('permission:audit.view')
        ->name('audit.index');

    // Library Settings
    Route::get('/library', [LibraryPageController::class, 'index'])
        ->middleware('permission:library.manage')
        ->name('library.index');
});
