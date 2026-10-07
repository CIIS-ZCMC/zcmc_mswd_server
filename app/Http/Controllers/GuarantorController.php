<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreGuarantorRequest;
use App\Http\Requests\UpdateGuarantorRequest;
use App\Http\Resources\GuarantorResource;
use App\Models\Guarantor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Guarantors (MAIFIP, PCSO, DSWD, …). Reads are open to any signed-in user, for the
 * dropdowns; anyone who may record a guarantee may also manage the list. Small
 * reference table, so the whole list is returned unpaginated.
 */
class GuarantorController extends Controller implements HasMiddleware
{
    private const USAGE = ['patientGuarantees', 'patientAssistances'];

    public static function middleware(): array
    {
        return [
            new Middleware('permission:guarantee.create', only: ['store', 'update', 'destroy']),
        ];
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $items = Guarantor::query()
            // `?active=1` hides retired entries from new-record dropdowns
            // while leaving them resolvable on historical records.
            ->when($request->boolean('active'), fn ($query) => $query->where('is_active', true))
            ->withCount(self::USAGE)
            ->orderBy('name')
            ->get();

        return GuarantorResource::collection($items);
    }

    public function show(Guarantor $guarantor): GuarantorResource
    {
        return GuarantorResource::make($guarantor->loadCount(self::USAGE));
    }

    public function store(StoreGuarantorRequest $request): JsonResponse
    {
        $guarantor = Guarantor::create($request->validated());

        return GuarantorResource::make($guarantor->refresh()->loadCount(self::USAGE))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateGuarantorRequest $request, Guarantor $guarantor): GuarantorResource
    {
        $guarantor->update($request->validated());

        return GuarantorResource::make($guarantor->refresh()->loadCount(self::USAGE));
    }

    /**
     * Soft delete: records that already name the guarantor keep showing it, and new
     * records can no longer pick it.
     */
    public function destroy(Guarantor $guarantor): Response
    {
        $guarantor->delete();

        return response()->noContent();
    }
}
