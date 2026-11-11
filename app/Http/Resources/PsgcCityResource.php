<?php

namespace App\Http\Resources;

use App\Models\PsgcArea;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A city, municipality or Manila district, as the address picker lists it.
 *
 * @mixin PsgcArea
 */
class PsgcCityResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'code' => $this->code,
            'name' => $this->name,
            // "Tondo I/II, City of Manila" for a district; the name otherwise.
            'label' => $this->cityLabel(),
            'kind' => $this->kind,
            'province' => $this->province ? ['code' => $this->province->code, 'name' => $this->province->name] : null,
            'region' => $this->region ? ['code' => $this->region->code, 'name' => $this->region->name] : null,
        ];
    }
}
