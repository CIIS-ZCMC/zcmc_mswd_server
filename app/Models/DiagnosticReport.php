<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiagnosticReport extends Model
{
    use Auditable;

    protected $fillable = [
        'uploaded_by',
        'diagnostic_id',
        'report_type',
        'file_name',
        'file_path',
        'file_type',
        'remarks',
    ];

    public function diagnostic(): BelongsTo
    {
        return $this->belongsTo(Diagnostic::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Two hops: an uploaded report knows only its diagnostic.
     *
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        $case = $this->auditParent('diagnostic')?->auditParent('case');

        return ['patient_id' => $case?->patient_id, 'case_id' => $case?->id];
    }
}
