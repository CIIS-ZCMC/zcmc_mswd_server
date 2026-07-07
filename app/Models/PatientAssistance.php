<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PatientAssistance extends Model
{
    use SoftDeletes;

    protected $table = 'patient_assistance';

    protected $fillable = [
        'case_id',
        'assistant_type_id',
        'guarantor_id',
        'amount',
        'notes',
        'date_given',
        'created_by',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'date_given' => 'datetime',
        ];
    }

    public function case(): BelongsTo
    {
        return $this->belongsTo(CaseModel::class, 'case_id');
    }

    public function assistantType(): BelongsTo
    {
        return $this->belongsTo(AssistantType::class);
    }

    public function guarantor(): BelongsTo
    {
        return $this->belongsTo(Guarantor::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(PatientAssistanceLog::class, 'assistance_id');
    }

    public function reports(): HasMany
    {
        return $this->hasMany(PatientAssistanceReport::class, 'assistance_id');
    }
}
