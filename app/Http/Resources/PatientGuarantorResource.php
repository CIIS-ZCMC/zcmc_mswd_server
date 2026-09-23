<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shapes a hospital (SQL Server) guarantor ledger row. `whenHas` is used so the
 * output tolerates the real HIS schema — a column that doesn't exist is simply
 * omitted. The guarantor's name comes from the linked psDataCenter entity;
 * psGntrLedgers carries no name column of its own.
 */
class PatientGuarantorResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->getKey(),
            'transaction_id' => $this->whenHas('FK_psPatRegisters'),

            'guarantor_details' => $this->whenHas('FK_faCustomers', fn () => [
                'guarantor_id' => $this->whenHas('FK_faCustomers'),
                'guarantor_name' => $this->guarantor?->displayName(),
            ]),

            'post_date' => $this->postdate,
            'amount' => $this->amount,

            'isGlPost' => $this->glpostflag,
            'gl_post_date' => $this->glpostdate,
        ];
    }
}
