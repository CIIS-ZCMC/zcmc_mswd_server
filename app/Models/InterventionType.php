<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class InterventionType extends Model
{
    use SoftDeletes;

    protected $table = 'intervention_type';

    protected $fillable = [
        'name',
        'code',
        'description',
    ];

    public function interventions(): HasMany
    {
        return $this->hasMany(Intervention::class, 'intervention_type_id');
    }
}
