<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MswdClassificationMatrix extends Model
{
    use Auditable, SoftDeletes;

    protected $table = 'mswd_classification_matrices';

    protected $fillable = [
        'code',
        'name',
        'min_per_capita_income',
        'max_per_capita_income',
        'discount_percentage',
        'max_assistance_cap',
        'is_indigent',
    ];

    protected function casts(): array
    {
        return [
            'min_per_capita_income' => 'decimal:2',
            'max_per_capita_income' => 'decimal:2',
            'discount_percentage' => 'decimal:2',
            'max_assistance_cap' => 'decimal:2',
            'is_indigent' => 'boolean',
        ];
    }
}

