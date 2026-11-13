<?php

namespace App\Http\Controllers\Psgc;

use App\Http\Controllers\Controller;
use App\Http\Resources\PsgcCityResource;
use App\Models\PsgcArea;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Finds the city or municipality for an address picker. Matches the city's or
 * its province's name; cities in the hospital's home region come first, then
 * names that start with the search. Only areas with barangays are offered, so
 * the address can always be completed. docs/PSGC_ADDRESS_PLAN.md.
 */
class CitySearchController extends Controller
{
    private const LIMIT = 30;

    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'code' => ['nullable', 'string', 'size:10'],
        ]);

        $query = PsgcArea::query()
            ->active()
            ->pickableCities()
            ->with(['province', 'region', 'city']);

        if (filled($validated['code'] ?? null)) {
            return PsgcCityResource::collection($query->whereKey($validated['code'])->get());
        }

        $search = trim((string) ($validated['search'] ?? ''));

        if ($search !== '') {
            $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $search).'%';

            $query->where(fn ($q) => $q
                ->where('name', 'like', $like)
                ->orWhereHas('province', fn ($p) => $p->where('name', 'like', $like))
                ->orWhereHas('city', fn ($c) => $c->where('name', 'like', $like)));
        }

        $prefix = str_replace(['%', '_'], ['\%', '\_'], $search).'%';

        $cities = $query
            ->orderByRaw('case when region_code = ? then 0 else 1 end', [(string) config('services.psgc.home_region')])
            ->orderByRaw('case when name like ? or name like ? then 0 else 1 end', [$prefix, 'City of '.$prefix])
            ->orderBy('name')
            ->limit(self::LIMIT)
            ->get();

        return PsgcCityResource::collection($cities);
    }
}
