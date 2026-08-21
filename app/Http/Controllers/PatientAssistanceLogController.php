<?php

namespace App\Http\Controllers;

use App\Http\Resources\PatientAssistanceLogResource;
use App\Models\PatientAssistance;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class PatientAssistanceLogController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:assistance.view', only: ['index']),
        ];
    }

    /**
     * The status-transition timeline for an assistance, newest first.
     */
    public function index(PatientAssistance $assistance): AnonymousResourceCollection
    {
        return PatientAssistanceLogResource::collection(
            $assistance->logs()->with('actionBy')->latest('action_date')->get(),
        );
    }
}
