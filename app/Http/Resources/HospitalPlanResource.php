<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shapes a hospital (SQL Server) hospital-plan lookup row. Only the primary key
 * is proven against the live Bizbox schema; label columns stay commented until
 * the schema is dumped (see docs/TRANSACTION_MODULE_PLAN.md §C). When added they
 * go through whenHas() so a column that does not exist is omitted rather than
 * raising.
 */
class HospitalPlanResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->getKey(),
            'description' => $this->whenHas('description'),
            'is_active' => $this->whenHas('isActive'),
        ];
    }
}
