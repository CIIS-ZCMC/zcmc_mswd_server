<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * An officer whose name and title print on MSWD forms, e.g. the approver on the
 * DOH-MAIFIP Acknowledgement Slip. Each printable reads the one active signatory
 * for its role, so a change of officer is a Library edit, not a deploy. Audited:
 * staff with `library.manage` edit the list.
 */
class Signatory extends Model
{
    use Auditable, SoftDeletes;

    /** Printed roles: key => label. */
    public const ROLES = [
        'allied_health_chief' => 'Chief of Allied Health Professional Services (approver)',
    ];

    protected $fillable = [
        'name',
        'title',
        'role',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /** The active signatory printed for a role, or null when none is set. */
    public static function activeFor(string $role): ?self
    {
        return static::query()
            ->where('role', $role)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->first();
    }
}
