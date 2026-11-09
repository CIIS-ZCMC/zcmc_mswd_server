<?php

namespace App\Support;

use RuntimeException;

/**
 * Reads a UMIS API reply. UMIS encrypts every JSON reply (its
 * EncryptApiResponse middleware) as `{"encrypted": true, "payload": "..."}`,
 * where the payload is base64 of a 16-byte IV followed by the AES-256-CBC
 * ciphertext, keyed with UMIS's API_PAYLOAD_KEY padded with "0" (or cut) to 32
 * characters. A reply that is not encrypted (UMIS can switch it off) is read as
 * it is.
 */
final class UmisPayload
{
    private const CIPHER = 'aes-256-cbc';

    private const IV_LENGTH = 16;

    /**
     * @return array<string, mixed>
     *
     * @throws RuntimeException when the reply cannot be read; the message names
     *                          the setting to check and is not for end users
     */
    public static function decode(mixed $body, ?string $key): array
    {
        if (! is_array($body)) {
            throw new RuntimeException('The UMIS reply is not JSON.');
        }

        if (($body['encrypted'] ?? false) !== true) {
            return $body;
        }

        if ($key === null || $key === '') {
            throw new RuntimeException('The UMIS reply is encrypted but UMIS_PAYLOAD_KEY is not set.');
        }

        $raw = is_string($body['payload'] ?? null) ? base64_decode($body['payload'], true) : false;

        if ($raw === false || strlen($raw) <= self::IV_LENGTH) {
            throw new RuntimeException('The UMIS reply has no readable payload.');
        }

        $plain = openssl_decrypt(
            substr($raw, self::IV_LENGTH),
            self::CIPHER,
            self::key($key),
            OPENSSL_RAW_DATA,
            substr($raw, 0, self::IV_LENGTH),
        );

        $decoded = $plain === false ? null : json_decode($plain, true);

        if (! is_array($decoded)) {
            throw new RuntimeException('The UMIS reply could not be decrypted; check UMIS_PAYLOAD_KEY.');
        }

        return $decoded;
    }

    /**
     * The key exactly as UMIS derives it from API_PAYLOAD_KEY.
     */
    public static function key(string $key): string
    {
        return substr(str_pad($key, 32, '0'), 0, 32);
    }
}
