<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Guarantor extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'name',
        'address',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * Whether this is the DOH-MAIFIP guarantor, whose guarantees print the
     * Acknowledgement Slip. Guarantors have no code column, so the seeded name
     * (GuarantorSeeder) is the key.
     */
    public function isMaifip(): bool
    {
        return str_contains(strtoupper((string) $this->name), 'MAIFIP');
    }

    public function patientAssistances(): HasMany
    {
        return $this->hasMany(PatientAssistance::class);
    }

    public function patientGuarantees(): HasMany
    {
        return $this->hasMany(PatientGuarantee::class);
    }

    /**
     * Select options (id => name): the active guarantors, plus the ids a record already
     * uses so a retired one stays visible on it.
     *
     * @param  list<int>  $keepIds
     * @return array<int, string>
     */
    public static function idOptions(array $keepIds = []): array
    {
        return static::withTrashed()
            ->where(fn (Builder $query) => $query
                ->where(fn (Builder $live) => $live->where('is_active', true)->whereNull('deleted_at'))
                ->when($keepIds !== [], fn (Builder $q) => $q->orWhereIn('id', $keepIds)))
            ->orderBy('name')
            ->pluck('name', 'id')
            ->all();
    }
}
