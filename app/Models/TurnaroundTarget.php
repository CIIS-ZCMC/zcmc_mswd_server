<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;

/**
 * Citizen's Charter benchmarks for MSWD service turnaround time.
 * One row per stage (waiting, processing, total). Minutes can be adjusted
 * by users with `library.manage`.
 */
class TurnaroundTarget extends Model
{
    use Auditable;

    public const STAGE_WAITING = 'waiting';

    public const STAGE_PROCESSING = 'processing';

    public const STAGE_TOTAL = 'total';

    public const STAGES = [
        self::STAGE_WAITING,
        self::STAGE_PROCESSING,
        self::STAGE_TOTAL,
    ];

    public const DEFAULT_TARGETS = [
        self::STAGE_WAITING => 30,
        self::STAGE_PROCESSING => 60,
        self::STAGE_TOTAL => 90,
    ];

    public const STAGE_LABELS = [
        self::STAGE_WAITING => 'Waiting Time',
        self::STAGE_PROCESSING => 'Processing Time',
        self::STAGE_TOTAL => 'Total Turnaround Time',
    ];

    public const STAGE_DESCRIPTIONS = [
        self::STAGE_WAITING => 'From patient arrival to start of service (time in → start).',
        self::STAGE_PROCESSING => 'From start of service to completion (start → complete).',
        self::STAGE_TOTAL => 'Total duration from arrival to completion (time in → complete).',
    ];

    protected $fillable = [
        'minutes',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'minutes' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Map of active stages to their target minutes.
     *
     * @return array<string, int>
     */
    public static function activeMinutes(): array
    {
        return once(fn () => static::query()
            ->where('is_active', true)
            ->pluck('minutes', 'stage')
            ->all());
    }

    public function getLabelAttribute(): string
    {
        return self::STAGE_LABELS[$this->stage] ?? ucfirst(str_replace('_', ' ', $this->stage));
    }

    public function getDescriptionAttribute(): string
    {
        return self::STAGE_DESCRIPTIONS[$this->stage] ?? '';
    }
}
