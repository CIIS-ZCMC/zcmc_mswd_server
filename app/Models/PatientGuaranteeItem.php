<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One breakdown line of a guarantee: a Type of Assistance, its amount, the Mode of
 * Assistance and the Fund Source that pays it ("Others" funds say what they are in
 * `others_specify`). Lines from before this shape have no type or mode yet.
 */
class PatientGuaranteeItem extends Model
{
    use Auditable;

    protected $fillable = [
        'patient_guarantee_id',
        'assistant_type_id',
        'amount',
        'mode_of_assistance_id',
        'fund_source_id',
        'others_specify',
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
    public function assistanceType(): BelongsTo
    {
        return $this->belongsTo(AssistantType::class, 'assistant_type_id')->withTrashed();
    }

    /** Includes a deleted mode, so an old line still shows its name. */
    public function modeOfAssistance(): BelongsTo
    {
        return $this->belongsTo(ModeOfAssistance::class)->withTrashed();
    }

    /** Who pays for this line. Includes a deleted fund source, so an old line still shows it. */
    public function fundSource(): BelongsTo
    {
        return $this->belongsTo(FundSource::class)->withTrashed();
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
