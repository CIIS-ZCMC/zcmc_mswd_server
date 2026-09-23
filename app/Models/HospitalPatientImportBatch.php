<?php

namespace App\Models;

use App\Enums\HospitalPatientImportOutcome;
use App\Enums\HospitalPatientImportStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Tracks one bulk import of HIS patients into the local patients table: its
 * status, per-outcome counts and the per-row results. Operational record, not a
 * clinical one — deliberately not Auditable (a batch is not patient-scoped and
 * its rows would flood the activity log).
 */
class HospitalPatientImportBatch extends Model
{
    protected $fillable = [
        'requested_by',
        'sector_id',
        'status',
        'total',
        'created_count',
        'updated_count',
        'skipped_count',
        'failed_count',
        'started_at',
        'finished_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => HospitalPatientImportStatus::class,
            'total' => 'integer',
            'created_count' => 'integer',
            'updated_count' => 'integer',
            'skipped_count' => 'integer',
            'failed_count' => 'integer',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    public function results(): HasMany
    {
        return $this->hasMany(HospitalPatientImportResult::class, 'batch_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function sector(): BelongsTo
    {
        return $this->belongsTo(Sector::class);
    }

    public function markProcessing(): void
    {
        $this->update([
            'status' => HospitalPatientImportStatus::Processing,
            'started_at' => $this->started_at ?? now(),
        ]);
    }

    /**
     * Recompute the per-outcome counts and terminal status from the result rows.
     *
     * Derived rather than incremented so parallel chunk jobs never race on a
     * shared counter. Called once from the batch's finally() callback.
     */
    public function finalizeFromResults(): void
    {
        $counts = $this->results()
            ->selectRaw('outcome, count(*) as aggregate')
            ->groupBy('outcome')
            ->pluck('aggregate', 'outcome');

        $created = (int) ($counts[HospitalPatientImportOutcome::Created->value] ?? 0);
        $updated = (int) ($counts[HospitalPatientImportOutcome::Updated->value] ?? 0);
        $skipped = (int) ($counts[HospitalPatientImportOutcome::Skipped->value] ?? 0);
        $failed = (int) ($counts[HospitalPatientImportOutcome::Failed->value] ?? 0);

        $processed = $created + $updated + $skipped + $failed;

        $status = match (true) {
            $processed > 0 && $created + $updated === 0 && $failed > 0 => HospitalPatientImportStatus::Failed,
            $failed > 0 => HospitalPatientImportStatus::CompletedWithErrors,
            default => HospitalPatientImportStatus::Completed,
        };

        $this->update([
            'created_count' => $created,
            'updated_count' => $updated,
            'skipped_count' => $skipped,
            'failed_count' => $failed,
            'status' => $status,
            'finished_at' => now(),
        ]);
    }
}
