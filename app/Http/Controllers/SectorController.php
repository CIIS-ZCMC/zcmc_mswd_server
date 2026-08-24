<?php

namespace App\Http\Controllers;

use App\Http\Resources\SectorResource;
use App\Models\Sector;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Read-only lookup used to populate select inputs. Small reference tables, so
 * the whole list is returned unpaginated -- the same way the Filament panel
 * plucks them for its dropdowns.
 */
class SectorController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $items = Sector::query()
            ->orderBy('name')
            ->get();

        return SectorResource::collection($items);
    }

    public function show(Sector $sector): SectorResource
    {
        return SectorResource::make($sector);
    }
}
