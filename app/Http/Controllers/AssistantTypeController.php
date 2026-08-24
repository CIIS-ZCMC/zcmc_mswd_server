<?php

namespace App\Http\Controllers;

use App\Http\Resources\AssistantTypeResource;
use App\Models\AssistantType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Read-only lookup used to populate select inputs. Small reference tables, so
 * the whole list is returned unpaginated -- the same way the Filament panel
 * plucks them for its dropdowns.
 */
class AssistantTypeController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $items = AssistantType::query()
            // `?active=1` hides retired entries from new-record dropdowns
            // while leaving them resolvable on historical records.
            ->when($request->boolean('active'), fn ($query) => $query->where('is_active', true))
            ->orderBy('name')
            ->get();

        return AssistantTypeResource::collection($items);
    }

    public function show(AssistantType $assistantType): AssistantTypeResource
    {
        return AssistantTypeResource::make($assistantType);
    }
}
