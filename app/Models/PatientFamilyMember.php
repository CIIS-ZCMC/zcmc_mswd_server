<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PatientFamilyMember extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'patient_id',
        'name',
        'first_name',
        'middle_name',
        'last_name',
        'extension_name',
        'relationship',
        'birthdate',
        'sex',
        'civil_status',
        'age',
        'occupation',
        'monthly_income',
        'educational_attainment',
        'contact_number',
        'is_living_with_patient',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $model) {
            if ($model->first_name && $model->last_name) {
                if (empty($model->name) || $model->isDirty('first_name') || $model->isDirty('middle_name') || $model->isDirty('last_name') || $model->isDirty('extension_name')) {
                    $model->name = trim(preg_replace('/\s+/', ' ', "{$model->first_name} {$model->middle_name} {$model->last_name} {$model->extension_name}"));
                }
            } elseif (! empty($model->name) && empty($model->first_name) && empty($model->last_name)) {
                $trimmed = trim($model->name);
                if (str_contains($trimmed, ',')) {
                    $parts = explode(',', $trimmed, 2);
                    $model->last_name = trim($parts[0]);
                    $rest = preg_split('/\s+/', trim($parts[1] ?? '')) ?: [];
                    $model->first_name = $rest[0] ?? null;
                    $model->middle_name = count($rest) > 1 ? implode(' ', array_slice($rest, 1)) : null;
                } else {
                    $parts = preg_split('/\s+/', $trimmed) ?: [];
                    if (count($parts) === 1) {
                        $model->first_name = $parts[0];
                        $model->last_name = $parts[0];
                    } elseif (count($parts) === 2) {
                        $model->first_name = $parts[0];
                        $model->last_name = $parts[1];
                    } else {
                        $model->first_name = $parts[0];
                        $model->middle_name = implode(' ', array_slice($parts, 1, -1));
                        $model->last_name = end($parts);
                    }
                }
            }
        });
    }

    protected function casts(): array
    {
        return [
            'birthdate' => 'date',
            'monthly_income' => 'decimal:2',
            'is_living_with_patient' => 'boolean',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    /**
     * @return array{patient_id: int|null, case_id: int|null}
     */
    public function activityOwner(): array
    {
        return ['patient_id' => $this->patient_id, 'case_id' => null];
    }
}
