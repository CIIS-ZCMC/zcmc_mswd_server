<?php

namespace App\Http\Controllers;

use App\Http\Resources\WatcherRelationshipTypeResource;
use App\Models\WatcherRelationshipType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Read-only lookup used to populate select inputs. Small reference table, so
 * the whole list is returned unpaginated, same as the other reference lookups.
 */
class WatcherRelationshipTypeController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $items = WatcherRelationshipType::query()
            ->orderBy('name')
            ->get();

        return WatcherRelationshipTypeResource::collection($items);
    }

    public function show(WatcherRelationshipType $watcherRelationshipType): WatcherRelationshipTypeResource
    {
        return WatcherRelationshipTypeResource::make($watcherRelationshipType);
    }
}
