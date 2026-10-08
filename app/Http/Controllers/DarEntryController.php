<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDarEntryRequest;
use App\Http\Requests\UpdateDarEntryRequest;
use App\Http\Resources\DarEntryResource;
use App\Models\DarEntry;
use App\Services\DarReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Carbon;

/**
 * The signed-in worker's Daily Accomplishment Report lines. A DAR is its owner's only:
 * nobody lists, edits or deletes another worker's lines, whatever their role.
 */
class DarEntryController extends Controller implements HasMiddleware
{
    public function __construct(protected DarReportService $dar) {}

    public static function middleware(): array
    {
        return [new Middleware('permission:dar.manage')];
    }

    /** One day of the caller's DAR (`?date=`, default today), with its totals. */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate(['date' => ['sometimes', 'date_format:Y-m-d']]);
        $date = Carbon::parse($validated['date'] ?? today()->toDateString());

        $entries = $this->dar->entriesFor($request->user(), $date);

        return response()->json([
            'date' => $date->toDateString(),
            'data' => DarEntryResource::collection($entries)->resolve($request),
            'summary' => $this->dar->summary($entries),
            'activities' => DarEntry::ACTIVITIES,
        ]);
    }

    public function store(StoreDarEntryRequest $request): JsonResponse
    {
        $entry = DarEntry::create([...$request->validated(), 'user_id' => $request->user()->id]);

        return DarEntryResource::make($entry->load('patient'))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateDarEntryRequest $request, DarEntry $entry): DarEntryResource
    {
        $this->ensureOwner($request, $entry);

        $entry->update($request->validated());

        return DarEntryResource::make($entry->load('patient'));
    }

    public function destroy(Request $request, DarEntry $entry): Response
    {
        $this->ensureOwner($request, $entry);

        $entry->delete();

        return response()->noContent();
    }

    private function ensureOwner(Request $request, DarEntry $entry): void
    {
        abort_unless((int) $entry->user_id === (int) $request->user()->id, Response::HTTP_FORBIDDEN, 'This entry is on another worker\'s DAR.');
    }
}
