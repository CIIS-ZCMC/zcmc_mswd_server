<?php

namespace App\Services;

use App\Enums\HospitalPatientImportStatus;
use App\Jobs\ImportHospitalPatientsChunkJob;
use App\Models\HospitalPatientImportBatch;
use App\Models\User;
use Illuminate\Support\Facades\Bus;

class HospitalPatientImportService
{
    /**
     * HIS ids per chunk job. Small enough to keep each job's SQL Server fetch
     * and per-row upserts bounded, large enough to keep the job count sane.
     */
    private const CHUNK_SIZE = 50;

    /**
     * Import a set of HIS patients into the local patients table, keyed on
     * hospital_id. Records a batch, dispatches chunk jobs, and finalizes the
     * batch's counts and status when they finish.
     *
     * @param  list<int>  $ids  HIS surrogate keys (PK_emdPatients)
     */
    public function importByIds(array $ids, ?int $sectorId = null, ?User $requester = null): HospitalPatientImportBatch
    {
        $ids = array_values(array_unique(array_map('intval', $ids)));

        $batch = HospitalPatientImportBatch::create([
            'requested_by' => $requester?->id,
            'sector_id' => $sectorId,
            'status' => HospitalPatientImportStatus::Pending,
            'total' => count($ids),
        ]);

        if ($ids === []) {
            $batch->finalizeFromResults();

            return $batch;
        }

        $jobs = array_map(
            fn (array $chunk) => new ImportHospitalPatientsChunkJob($batch->id, array_values($chunk), $sectorId),
            array_chunk($ids, self::CHUNK_SIZE),
        );

        // Mark processing before dispatch: under the sync queue the jobs (and the
        // finally() finalize) run inside dispatch(), so setting it afterwards
        // would clobber the terminal status.
        $batch->markProcessing();

        Bus::batch($jobs)
            ->name("his-import:{$batch->id}")
            ->finally(fn () => $batch->fresh()?->finalizeFromResults())
            ->catch(fn () => $batch->update([
                'status' => HospitalPatientImportStatus::Failed,
                'finished_at' => now(),
            ]))
            ->dispatch();

        return $batch;
    }
}
