<?php

namespace App\Http\Controllers;

use App\Http\Resources\GuarantorResource;
use App\Models\Guarantor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Read-only lookup used to populate select inputs. Small reference tables, so
 * the whole list is returned unpaginated -- the same way the Filament panel
 * plucks them for its dropdowns.
 */
class GuarantorController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $items = Guarantor::query()
            // `?active=1` hides retired entries from new-record dropdowns
            // while leaving them resolvable on historical records.
            ->when($request->boolean('active'), fn ($query) => $query->where('is_active', true))
            ->orderBy('name')
            ->get();

        return GuarantorResource::collection($items);
    }

    public function show(Guarantor $guarantor): GuarantorResource
    {
        return GuarantorResource::make($guarantor);
    }
}
