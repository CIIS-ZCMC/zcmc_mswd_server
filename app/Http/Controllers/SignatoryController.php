<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSignatoryRequest;
use App\Http\Requests\UpdateSignatoryRequest;
use App\Http\Resources\SignatoryResource;
use App\Models\Signatory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Signatories: the officers printed on MSWD forms (Library). Reads are open to any
 * signed-in user; `library.manage` edits the list. Small table, returned unpaginated.
 */
class SignatoryController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:library.manage', only: ['store', 'update', 'destroy']),
        ];
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $items = Signatory::query()
            ->when($request->boolean('active'), fn ($query) => $query->where('is_active', true))
            ->orderBy('role')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return SignatoryResource::collection($items);
    }

    public function show(Signatory $signatory): SignatoryResource
    {
        return SignatoryResource::make($signatory);
    }

    public function store(StoreSignatoryRequest $request): JsonResponse
    {
        $signatory = Signatory::create($request->validated());

        return SignatoryResource::make($signatory->refresh())
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateSignatoryRequest $request, Signatory $signatory): SignatoryResource
    {
        $signatory->update($request->validated());

        return SignatoryResource::make($signatory->refresh());
    }

    /** Soft delete; forms already printed are unaffected. */
    public function destroy(Signatory $signatory): Response
    {
        $signatory->delete();

        return response()->noContent();
    }
}
