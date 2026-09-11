<?php

namespace App\Http\Controllers;

use App\Http\Resources\CaseModelResource;
use App\Models\CaseModel;
use App\Services\CaseModelService;
use App\Support\ListQuery;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * The case manager's own worklist.
 *
 * A dedicated route rather than `GET /cases?filter[assigned_user_id]=me`:
 * BaseRepository::applyFilters() passes filter values straight into where(),
 * so `=me` would need a magic-string special case inside the generic filter
 * path. `filter[assigned_user_id]=<id>` still works for a supervisor
 * inspecting one worker's list.
 */
class MyCaseloadController extends Controller
{
    public function __invoke(Request $request, CaseModelService $service): AnonymousResourceCollection
    {
        $statuses = $this->statuses($request);
        $socialCaseStatus = $this->socialCaseStatus($request);

        $cases = $service->caseload($request->user(), $statuses, $socialCaseStatus, ListQuery::fromRequest($request));

        return CaseModelResource::collection($cases)->additional([
            'meta' => ['buckets' => $service->caseloadBuckets($request->user(), $statuses)],
        ]);
    }

    /**
     * @return list<string>
     */
    private function statuses(Request $request): array
    {
        $requested = array_filter(array_map('trim', explode(',', (string) $request->query('status'))));

        $allowed = array_values(array_intersect($requested, [
            CaseModel::STATUS_OPEN,
            CaseModel::STATUS_ONGOING,
            CaseModel::STATUS_CLOSED,
            CaseModel::STATUS_REFERRED,
        ]));

        return $allowed !== [] ? $allowed : CaseModelService::CASELOAD_DEFAULT_STATUSES;
    }

    private function socialCaseStatus(Request $request): ?string
    {
        $value = $request->query('social_case_status');

        return in_array($value, CaseModelService::CASELOAD_SOCIAL_CASE_BUCKETS, true) ? $value : null;
    }
}
