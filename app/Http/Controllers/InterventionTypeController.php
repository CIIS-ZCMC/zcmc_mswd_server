<?php

namespace App\Http\Controllers;

use App\Http\Resources\InterventionTypeResource;
use App\Models\InterventionType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Read-only lookup used to populate select inputs. Small reference tables, so
 * the whole list is returned unpaginated -- the same way the Filament panel
 * plucks them for its dropdowns.
 */
class InterventionTypeController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $items = InterventionType::query()
            ->orderBy('name')
            ->get();

        return InterventionTypeResource::collection($items);
    }

    public function show(InterventionType $interventionType): InterventionTypeResource
    {
        return InterventionTypeResource::make($interventionType);
    }
}
