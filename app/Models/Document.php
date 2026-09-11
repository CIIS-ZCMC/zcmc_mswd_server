<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Document extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'case_id',
        'patient_id',
        'intervention_id',
        'uploaded_by',
        'document_type',
        'file_name',
        'file_path',
        'file_type',
    ];

    public function case(): BelongsTo
    {
        return $this->belongsTo(CaseModel::class, 'case_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function intervention(): BelongsTo
    {
        return $this->belongsTo(Intervention::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * A document carries both ids itself, so this costs no query.
     *
     * The caretake plan specced a `patient_id ?? case.patient_id` fallback here,
     * on the assumption that a patient-level document has no case. It does not:
     * `create_documents_table` constrains both columns NOT NULL, so every
     * document belongs to exactly one case and one patient, and the fallback
     * branch was unreachable. Should `patient_id` ever become nullable, this is
     * where the hop through the case goes.
     *
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        return ['patient_id' => $this->patient_id, 'case_id' => $this->case_id];
    }
}
