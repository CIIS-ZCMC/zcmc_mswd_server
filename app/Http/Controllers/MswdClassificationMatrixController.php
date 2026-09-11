<?php

namespace App\Http\Controllers;

use App\Models\MswdClassificationMatrix;
use Illuminate\Http\JsonResponse;

class MswdClassificationMatrixController extends Controller
{
    public function index(): JsonResponse
    {
        $matrices = MswdClassificationMatrix::whereNull('deleted_at')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $matrices,
        ]);
    }
}

