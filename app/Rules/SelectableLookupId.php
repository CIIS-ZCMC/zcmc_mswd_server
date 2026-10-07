<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;

/**
 * An id picked from a Library list (Type of Assistance, Mode of Assistance, Fund Source,
 * guarantor): it must belong to a row that is active and not deleted. The ids the record
 * already uses are always accepted, so retiring an option never blocks saving the
 * records that use it.
 */
class SelectableLookupId implements ValidationRule
{
    /**
     * @param  list<int>  $keepIds
     */
    public function __construct(
        private readonly string $table,
        private readonly array $keepIds = [],
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_numeric($value)) {
            return; // the `integer` rule reports it
        }

        if (in_array((int) $value, $this->keepIds, true)) {
            return;
        }

        $selectable = DB::table($this->table)
            ->where('id', (int) $value)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->exists();

        if (! $selectable) {
            $fail('The selected :attribute is invalid.');
        }
    }
}
