<?php

namespace App\Http\Controllers;

use App\Http\Resources\ActivityResource;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ActivityLogController extends Controller
{
    public function __construct(protected ActivityLogService $service) {}

    /**
     * The global audit log, and — with `subject_type` + `subject_id` — the
     * inline per-record drill-down. One endpoint, two filter widths.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'user_id' => ['nullable', 'integer'],
            'patient_id' => ['nullable', 'integer'],
            'case_id' => ['nullable', 'integer'],
            'subject_type' => ['nullable', 'string', 'max:255'],
            'subject_id' => ['nullable', 'integer'],
            'event' => ['nullable', 'string'],
            'log_name' => ['nullable', 'string', 'max:255'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1'],
        ]);

        return ActivityResource::collection($this->service->paginate(
            $filters,
            $request->user(),
            isset($filters['per_page']) ? (int) $filters['per_page'] : null,
        ));
    }
}
