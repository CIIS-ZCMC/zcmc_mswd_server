<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Patient extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'sector_id',
        'hospital_id',
        'mswd_id',
        'first_name',
        'last_name',
        'middle_name',
        'extension_name',
        'birthdate',
        'estimated_age',
        'sex',
        'civil_status',
        'address',
        'barangay',
        'municipality',
        'province',
        'contact_number',
    ];

    protected function casts(): array
    {
        return [
            'birthdate' => 'date',
        ];
    }

    public function sector(): BelongsTo
    {
        return $this->belongsTo(Sector::class);
    }

    public function patientIds(): HasMany
    {
        return $this->hasMany(PatientId::class);
    }

    public function watchers(): HasMany
    {
        return $this->hasMany(PatientWatcher::class);
    }

    public function familyMembers(): HasMany
    {
        return $this->hasMany(PatientFamilyMember::class);
    }

    public function caretakers(): HasMany
    {
        return $this->hasMany(PatientCaretaker::class);
    }

    public function cases(): HasMany
    {
        return $this->hasMany(CaseModel::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }
}
