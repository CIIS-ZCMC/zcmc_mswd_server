<?php

namespace App\Http\Controllers\Psgc;

use App\Http\Controllers\Controller;
use App\Http\Resources\PsgcBarangayResource;
use App\Models\PsgcArea;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Every barangay of one city or municipality, for the address picker's second
 * step. The list is small (at most a few hundred), so the client filters it.
 */
class CityBarangaysController extends Controller
{
    public function __invoke(string $city): AnonymousResourceCollection
    {
        abort_unless(
            PsgcArea::query()->whereKey($city)->where('level', PsgcArea::CITY)->exists(),
            404,
        );

        $barangays = PsgcArea::query()
            ->active()
            ->barangaysOf($city)
            ->orderBy('name')
            ->get(['code', 'name']);

        return PsgcBarangayResource::collection($barangays);
    }
}
