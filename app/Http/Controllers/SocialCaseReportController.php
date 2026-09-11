<?php

namespace App\Http\Controllers;

use App\Services\SocialCaseReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SocialCaseReportController extends Controller
{
    public function __invoke(Request $request, SocialCaseReportService $service): JsonResponse
    {
        return response()->json([
            'data' => $service->summary(
                $request->user(),
                $request->query('from'),
                $request->query('to'),
            ),
        ]);
    }
}
