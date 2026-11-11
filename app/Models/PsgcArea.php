<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One Philippine Standard Geographic Code area. Reference data loaded by
 * `psgc:load`, so it is not audited. docs/PSGC_ADDRESS_PLAN.md.
 *
 * @property string $code
 * @property string $level
 * @property string|null $kind
 * @property string $name
 * @property string|null $region_code
 * @property string|null $province_code
 * @property string|null $city_code
 * @property string|null $zip_code
 */
class PsgcArea extends Model
{
    public const REGION = 'region';

    public const PROVINCE = 'province';

    public const CITY = 'city';

    public const BARANGAY = 'barangay';

    protected $primaryKey = 'code';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'code',
        'level',
        'kind',
        'name',
        'region_code',
        'province_code',
        'city_code',
        'zip_code',
        'retired_at',
    ];

    protected function casts(): array
    {
        return [
            'retired_at' => 'datetime',
        ];
    }

    /** @param  Builder<self>  $query */
    public function scopeActive(Builder $query): void
    {
        $query->whereNull('retired_at');
    }

    /**
     * Cities, municipalities and Manila districts that have barangays, so an
     * address can always be completed (the City of Manila itself has none;
     * its districts do).
     *
     * @param  Builder<self>  $query
     */
    public function scopePickableCities(Builder $query): void
    {
        $query->where('level', self::CITY)
            ->whereExists(fn ($barangays) => $barangays
                ->from('psgc_areas as b')
                ->whereColumn('b.city_code', 'psgc_areas.code')
                ->where('b.level', self::BARANGAY));
    }

    /** @param  Builder<self>  $query */
    public function scopeBarangaysOf(Builder $query, string $cityCode): void
    {
        $query->where('level', self::BARANGAY)->where('city_code', $cityCode);
    }

    /** @return BelongsTo<self, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(self::class, 'region_code', 'code');
    }

    /** @return BelongsTo<self, $this> */
    public function province(): BelongsTo
    {
        return $this->belongsTo(self::class, 'province_code', 'code');
    }

    /** The city a barangay belongs to, or the City of Manila for a district. */
    public function city(): BelongsTo
    {
        return $this->belongsTo(self::class, 'city_code', 'code');
    }

    /**
     * How a city reads in a picker and on an address: a Manila district names
     * its city ("Tondo I/II, City of Manila").
     */
    public function cityLabel(): string
    {
        return $this->kind === 'SubMun' && $this->city
            ? "{$this->name}, {$this->city->name}"
            : $this->name;
    }
}
