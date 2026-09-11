<?php

namespace App\DTOs;

class CaseProgressNoteDto
{
    /**
     * Keys present in the source array, whatever their value — lets toArray()
     * distinguish "omitted" from "explicit null" (clearing a follow-up date).
     *
     * @var array<int, string>
     */
    private readonly array $suppliedKeys;

    public function __construct(
        public readonly ?string $note_type = null,
        public readonly ?string $note_date = null,
        public readonly ?string $narrative = null,
        public readonly ?string $follow_up_on = null,
        array $suppliedKeys = [],
    ) {
        $this->suppliedKeys = $suppliedKeys;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            note_type: $data['note_type'] ?? null,
            note_date: $data['note_date'] ?? null,
            narrative: $data['narrative'] ?? null,
            follow_up_on: $data['follow_up_on'] ?? null,
            suppliedKeys: array_keys($data),
        );
    }

    public function toArray(): array
    {
        $all = [
            'note_type' => $this->note_type,
            'note_date' => $this->note_date,
            'narrative' => $this->narrative,
            'follow_up_on' => $this->follow_up_on,
        ];

        return array_intersect_key($all, array_flip($this->suppliedKeys));
    }
}
