<?php

namespace App\DTOs;

class PatientAssistanceDto
{
    public function __construct(
        public readonly ?int $case_id = null,
        public readonly ?int $assistant_type_id = null,
        public readonly ?int $guarantor_id = null,
        public readonly ?float $amount = null,
        public readonly ?string $notes = null,
        public readonly ?string $date_given = null,
        public readonly ?int $created_by = null,
        public readonly ?string $status = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            case_id: $data['case_id'] ?? null,
            assistant_type_id: $data['assistant_type_id'] ?? null,
            guarantor_id: $data['guarantor_id'] ?? null,
            amount: $data['amount'] ?? null,
            notes: $data['notes'] ?? null,
            date_given: $data['date_given'] ?? null,
            created_by: $data['created_by'] ?? null,
            status: $data['status'] ?? null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'case_id' => $this->case_id,
            'assistant_type_id' => $this->assistant_type_id,
            'guarantor_id' => $this->guarantor_id,
            'amount' => $this->amount,
            'notes' => $this->notes,
            'date_given' => $this->date_given,
            'created_by' => $this->created_by,
            'status' => $this->status,
        ], fn ($value) => $value !== null);
    }
}
