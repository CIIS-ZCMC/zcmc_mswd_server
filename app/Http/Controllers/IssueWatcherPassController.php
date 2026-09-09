<?php

namespace App\Http\Controllers;

use App\Http\Resources\CaseWatcherResource;
use App\Models\CaseWatcher;
use App\Services\CaseWatcherService;
use Illuminate\Http\Request;

/**
 * Not in the plan's original route list, but pass issuance needs some entry
 * point — the client's "Issue Watcher Pass" button (§8) has nothing to call
 * otherwise. Mirrors RevokeWatcherPassController's shape.
 */
class IssueWatcherPassController extends Controller
{
    public function __invoke(Request $request, CaseWatcher $caseWatcher, CaseWatcherService $service): CaseWatcherResource
    {
        $validated = $request->validate([
            'pass_valid_until' => ['nullable', 'date'],
        ]);

        return CaseWatcherResource::make($service->issuePass($caseWatcher, $validated['pass_valid_until'] ?? null));
    }
}
