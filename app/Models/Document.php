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
        'document_type_id',
        'document_type',
        'file_name',
        'file_path',
        'file_type',
        'file_size',
        'disk',
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
        ];
    }

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

    public function documentType(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class)->withTrashed();
    }

    /** The disk the file was stored on; rows from before the column was added used the default. */
    public function storageDisk(): string
    {
        return $this->disk ?? config('filesystems.default');
    }

    /**
     * A document carries its patient id itself, so this costs no query. The case is
     * optional (a patient's ID can be filed before any case exists), so `case_id` may
     * be null.
     *
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        return ['patient_id' => $this->patient_id, 'case_id' => $this->case_id];
    }
}
