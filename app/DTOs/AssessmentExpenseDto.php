<?php

namespace App\DTOs;

class AssessmentExpenseDto
{
    /**
     * Keys present in the source array, whatever their value — lets toArray()
     * distinguish "omitted" from "explicit null".
     *
     * @var array<int, string>
     */
    private readonly array $suppliedKeys;

    public function __construct(
        public readonly ?int $assessment_id = null,
        public readonly ?string $expense_type = null,
        public readonly ?float $amount = null,
        array $suppliedKeys = [],
    ) {
        $this->suppliedKeys = $suppliedKeys;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            assessment_id: $data['assessment_id'] ?? null,
            expense_type: $data['expense_type'] ?? null,
            amount: $data['amount'] ?? null,
            suppliedKeys: array_keys($data),
        );
    }

    public function toArray(): array
    {
        $all = [
            'assessment_id' => $this->assessment_id,
            'expense_type' => $this->expense_type,
            'amount' => $this->amount,
        ];

        $attributes = array_intersect_key($all, array_flip($this->suppliedKeys));

        // assessment_id stays present-only, so an update can never null out —
        // and thus reparent — an expense line.
        return array_filter(
            $attributes,
            fn ($value, $key) => $key !== 'assessment_id' || $value !== null,
            ARRAY_FILTER_USE_BOTH,
        );
    }
}
