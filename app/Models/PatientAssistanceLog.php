<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientAssistanceLog extends Model
{
    protected $fillable = [
        'assistance_id',
        'status',
        'action',
        'action_by',
        'action_date',
    ];

    protected function casts(): array
    {
        return [
            'action_date' => 'datetime',
        ];
    }

    public function assistance(): BelongsTo
    {
        return $this->belongsTo(PatientAssistance::class, 'assistance_id');
    }

    public function actionBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'action_by');
    }
}
