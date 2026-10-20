<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CaseWatcher extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'case_id',
        'patient_watcher_id',
        'is_primary',
        'is_informant',
        'pass_number',
        'pass_valid_until',
        'pass_status',
        'present_from',
        'present_until',
        'added_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
            'is_informant' => 'boolean',
            'pass_valid_until' => 'date',
            'present_from' => 'datetime',
            'present_until' => 'datetime',
        ];
    }

    public function case(): BelongsTo
    {
        return $this->belongsTo(CaseModel::class, 'case_id');
    }

    public function patientWatcher(): BelongsTo
    {
        return $this->belongsTo(PatientWatcher::class)->withTrashed();
    }

    /**
     * The watcher's name, read through the patient watcher — the activity log
     * labels a row by its `name`.
     */
    protected function name(): Attribute
    {
        return Attribute::get(fn () => $this->patientWatcher?->name);
    }

    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }

    /**
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        $case = $this->auditParent('case');

        return ['patient_id' => $case?->patient_id, 'case_id' => $this->case_id];
    }
}
