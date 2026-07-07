<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Intervention extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'case_id',
        'created_by',
        'intervention_type_id',
        'description',
        'date_given',
        'outcome',
    ];

    protected function casts(): array
    {
        return [
            'date_given' => 'date',
        ];
    }

    public function case(): BelongsTo
    {
        return $this->belongsTo(CaseModel::class, 'case_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function interventionType(): BelongsTo
    {
        return $this->belongsTo(InterventionType::class, 'intervention_type_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }
}
