<?php

use App\Http\Controllers\RoleController;
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
        Route::get('permissions', [RoleController::class, 'permissions']);
        Route::apiResource('roles', RoleController::class);
    });
});
