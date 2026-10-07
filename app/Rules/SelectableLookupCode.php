<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;

/**
 * A code that assessments store from a Library list (mode of assistance, fund source):
 * it must belong to a row that is active and not deleted. The value the record already
 * stores is always accepted, so retiring an option never blocks saving the records that
 * use it.
 */
class SelectableLookupCode implements ValidationRule
{
    public function __construct(
        private readonly string $table,
        private readonly ?string $current = null,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '' || $value === $this->current) {
            return;
        }

        $selectable = DB::table($this->table)
            ->where('code', $value)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->exists();

        if (! $selectable) {
            $fail('The selected :attribute is invalid.');
        }
    }
}
