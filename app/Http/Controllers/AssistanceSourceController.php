<?php

namespace App\Http\Controllers;

use App\Http\Resources\AssistanceSourceResource;
use App\Models\AssistanceSource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Read-only lookup of the assistance sources a guarantee's breakdown lines use.
 * Unpaginated, like the other reference lookups.
 */
class AssistanceSourceController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $items = AssistanceSource::query()
            // `?active=1` hides retired sources from new-record dropdowns while leaving
            // them resolvable on historical records.
            ->when($request->boolean('active'), fn ($query) => $query->where('is_active', true))
            ->orderBy('name')
            ->get();

        return AssistanceSourceResource::collection($items);
    }

    public function show(AssistanceSource $assistanceSource): AssistanceSourceResource
    {
        return AssistanceSourceResource::make($assistanceSource);
    }
}
