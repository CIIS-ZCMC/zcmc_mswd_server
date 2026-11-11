<?php

namespace App\Rules;

use App\Models\PsgcArea;
use Closure;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Arr;

/**
 * The value is a PSGC barangay of the city named in another input field.
 */
class PsgcBarangayInCity implements DataAwareRule, ValidationRule
{
    /** @var array<string, mixed> */
    private array $data = [];

    /**
     * @param  string  $cityField  dot-notation key of the city code in the input
     */
    public function __construct(private readonly string $cityField) {}

    /** @param  array<string, mixed>  $data */
    public function setData(array $data): static
    {
        $this->data = $data;

        return $this;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (blank($value)) {
            return;
        }

        $cityCode = Arr::get($this->data, $this->cityField);

        $belongs = filled($cityCode) && PsgcArea::query()
            ->whereKey((string) $value)
            ->where('level', PsgcArea::BARANGAY)
            ->where('city_code', (string) $cityCode)
            ->exists();

        if (! $belongs) {
            $fail('Pick a barangay of the selected city or municipality.');
        }
    }
}
