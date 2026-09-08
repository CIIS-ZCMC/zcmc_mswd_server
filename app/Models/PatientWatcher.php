<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PatientWatcher extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'patient_id',
        'name',
        'relationship',
        'contact_number',
        'address',
        'is_primary',
    ];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    /**
     * Episode links created from this directory entry. Most are ad-hoc
     * (patient_watcher_id null on case_watchers), so this is often empty.
     */
    public function caseWatchers(): HasMany
    {
        return $this->hasMany(CaseWatcher::class);
    }
}
