<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One breakdown line of a guarantee: an assistance source and its amount.
 */
class PatientGuaranteeItem extends Model
{
    use Auditable;

    protected $fillable = [
        'patient_guarantee_id',
        'assistance_source_id',
        'others_specify',
        'amount',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    public function guarantee(): BelongsTo
    {
        return $this->belongsTo(PatientGuarantee::class, 'patient_guarantee_id');
    }

    /** Includes a deleted type, so an old line still shows its name. */
    public function source(): BelongsTo
    {
        return $this->belongsTo(AssistanceSource::class, 'assistance_source_id')->withTrashed();
    }

    /**
     * Through the guarantee this line belongs to.
     *
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        return ['patient_id' => $this->auditParent('guarantee')?->patient_id, 'case_id' => null];
    }
}
