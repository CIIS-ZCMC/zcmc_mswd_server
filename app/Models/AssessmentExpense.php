<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentExpense extends Model
{
    use Auditable;

    protected $fillable = [
        'assessment_id',
        'expense_type',
        'amount',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class);
    }

    /**
     * Two hops: an expense line knows only its assessment, which knows the case.
     *
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        $case = $this->auditParent('assessment')?->auditParent('case');

        return ['patient_id' => $case?->patient_id, 'case_id' => $case?->id];
    }
}
