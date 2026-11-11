<?php

namespace App\Enums;

use RuntimeException;

/**
 * Which sign-in staff use (`services.auth_provider`, env `AUTH_PROVIDER`).
 */
enum AuthProvider: string
{
    /** The ZCMC Portal hands staff over (UMIS). */
    case Umis = 'umis';

    /** ZCMC IAM single sign-on. */
    case Iam = 'iam';

    /** Employee number + password, checked by this server alone. */
    case Local = 'local';

    /**
     * The provider in use. An unknown value is a misconfiguration and fails
     * loudly, rather than quietly leaving nobody able to sign in.
     */
    public static function current(): self
    {
        $value = config('services.auth_provider');

        return self::tryFrom(is_string($value) ? strtolower(trim($value)) : '')
            ?? throw new RuntimeException(sprintf(
                'AUTH_PROVIDER must be one of %s; got "%s".',
                implode(', ', array_column(self::cases(), 'value')),
                is_scalar($value) ? (string) $value : get_debug_type($value),
            ));
    }

    public static function isLocal(): bool
    {
        return self::current() === self::Local;
    }
}
