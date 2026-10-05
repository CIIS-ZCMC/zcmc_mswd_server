<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientSocioeconomicExpense extends Model
{
    use Auditable;

    protected $fillable = [
        'profile_id',
        'expense_type',
        'amount',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(PatientSocioeconomicProfile::class, 'profile_id');
    }

    /**
     * One hop: an expense line knows only its profile, which knows the patient.
     *
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        return ['patient_id' => $this->auditParent('profile')?->patient_id, 'case_id' => null];
    }
}
