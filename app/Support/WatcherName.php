<?php

namespace App\Support;

/**
 * A watcher is entered as last, first and middle name; `patient_watchers.name`
 * keeps the composed full name so everything that only shows a name still works.
 */
class WatcherName
{
    /**
     * "First M. Last", the same order the patient's own full name uses. The
     * middle name is shortened to an initial.
     */
    public static function compose(?string $first, ?string $middle, ?string $last): string
    {
        $initial = ($middle !== null && trim($middle) !== '') ? mb_substr(trim($middle), 0, 1).'.' : '';

        return preg_replace('/\s+/', ' ', trim(implode(' ', array_filter([trim((string) $first), $initial, trim((string) $last)]))));
    }

    /**
     * Best-effort split of a full name written before names were entered in
     * parts: "Last, First Middle" when it has a comma, otherwise the last word
     * is the last name and everything before it the first name.
     *
     * @return array{first: string|null, middle: string|null, last: string|null}
     */
    public static function split(?string $name): array
    {
        $name = trim(preg_replace('/\s+/', ' ', (string) $name));

        if ($name === '') {
            return ['first' => null, 'middle' => null, 'last' => null];
        }

        if (str_contains($name, ',')) {
            [$last, $rest] = array_map('trim', explode(',', $name, 2));
            $words = $rest === '' ? [] : explode(' ', $rest);

            return [
                'first' => $words[0] ?? null,
                'middle' => count($words) > 1 ? implode(' ', array_slice($words, 1)) : null,
                'last' => $last,
            ];
        }

        $words = explode(' ', $name);

        if (count($words) === 1) {
            return ['first' => null, 'middle' => null, 'last' => $words[0]];
        }

        return [
            'first' => implode(' ', array_slice($words, 0, -1)),
            'middle' => null,
            'last' => end($words),
        ];
    }
}
