<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PatientFamilyMember extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'patient_id',
        'name',
        'relationship',
        'age',
        'occupation',
        'monthly_income',
        'education',
        'contact_number',
        'is_living_with_patient',
    ];

    protected function casts(): array
    {
        return [
            'monthly_income' => 'decimal:2',
            'is_living_with_patient' => 'boolean',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
