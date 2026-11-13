<?php

namespace App\Support;

/**
 * Philippine standard mobile phone number (+63-9XXXXXXXXX).
 */
final class PhPhoneNumber
{
    public const REGEX = '/^\+63-9\d{9}$/';

    /**
     * Normalizes a valid Philippine mobile number (`+63-9171234567`,
     * `+63 917 123 4567`, `09171234567`, `9171234567`, etc.) into the
     * canonical `+63-9XXXXXXXXX` format.
     *
     * Invalid strings are returned unchanged so validation rules reject them.
     */
    public static function normalize(mixed $raw): mixed
    {
        if ($raw === null) {
            return null;
        }

        if (! is_string($raw)) {
            return $raw;
        }

        $trimmed = trim($raw);
        if ($trimmed === '') {
            return null;
        }

        // Strip formatting characters (spaces, hyphens, dots, parentheses).
        $compact = preg_replace('/[\s\-\.\(\)]+/', '', $trimmed) ?? $trimmed;

        if (preg_match('/^\+?63(9\d{9})$/', $compact, $matches)) {
            return '+63-'.$matches[1];
        }

        if (preg_match('/^0(9\d{9})$/', $compact, $matches)) {
            return '+63-'.$matches[1];
        }

        if (preg_match('/^(9\d{9})$/', $compact, $matches)) {
            return '+63-'.$matches[1];
        }

        return $trimmed;
    }

    /**
     * Validation rules for a Philippine standard mobile contact number.
     *
     * @param  array<int, string>  $prefixRules  e.g. ['required'] or ['nullable'] or ['sometimes', 'nullable']
     * @return array<int, string>
     */
    public static function rules(array $prefixRules = ['nullable']): array
    {
        return [
            ...$prefixRules,
            'string',
            'regex:'.self::REGEX,
        ];
    }
}
