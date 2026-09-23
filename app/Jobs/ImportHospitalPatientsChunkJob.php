<?php

namespace App\Jobs;

use App\Enums\HospitalPatientImportOutcome;
use App\Models\Bizbox\HospitalPatient;
use App\Models\HospitalPatientImportResult;
use App\Repositories\Contracts\HospitalPatientRepositoryInterface;
use App\Services\PatientService;
use Illuminate\Bus\Batchable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Validation\ValidationException;

/**
 * Imports one chunk of a HIS import batch: fetches the chunk's HIS rows in a
 * single query and upserts each into the local patients table, writing one
 * result row per requested id. Each row is isolated — one failure never aborts
 * the chunk. No retries: the upsert is idempotent, but a re-run would double the
 * result rows, so failures are recorded rather than retried.
 */
class ImportHospitalPatientsChunkJob implements ShouldQueue
{
    use Batchable, InteractsWithQueue, Queueable;

    public int $tries = 1;

    public int $timeout = 600;

    /**
     * @param  list<int>  $hospitalPatientIds
     */
    public function __construct(
        public int $importBatchId,
        public array $hospitalPatientIds,
        public ?int $sectorId = null,
    ) {}

    public function handle(HospitalPatientRepositoryInterface $repository, PatientService $patients): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        try {
            $rows = $repository->findManyByKeys($this->hospitalPatientIds)
                ->keyBy(fn (HospitalPatient $hp) => $hp->getKey());
        } catch (QueryException $e) {
            report($e);

            // HIS unreachable — record the whole chunk as failed rather than 500.
            foreach ($this->hospitalPatientIds as $id) {
                $this->record($id, null, HospitalPatientImportOutcome::Failed, 'The hospital system is unreachable.');
            }

            return;
        }

        foreach ($this->hospitalPatientIds as $id) {
            $hospitalPatient = $rows->get($id);

            if ($hospitalPatient === null) {
                $this->record($id, null, HospitalPatientImportOutcome::Failed, 'No matching record in the hospital system.');

                continue;
            }

            try {
                $patient = $patients->storeFromHospitalPatient($hospitalPatient, $this->sectorId);

                $this->record(
                    $id,
                    $hospitalPatient->patid,
                    $patient->wasRecentlyCreated ? HospitalPatientImportOutcome::Created : HospitalPatientImportOutcome::Updated,
                    patientId: $patient->id,
                );
            } catch (ValidationException $e) {
                $this->record($id, $hospitalPatient->patid, HospitalPatientImportOutcome::Skipped, $e->validator->errors()->first());
            } catch (\Throwable $e) {
                report($e);

                $this->record($id, $hospitalPatient->patid, HospitalPatientImportOutcome::Failed, $e->getMessage());
            }
        }
    }

    private function record(
        int|string $hospitalPatientId,
        int|string|null $hospitalId,
        HospitalPatientImportOutcome $outcome,
        ?string $message = null,
        ?int $patientId = null,
    ): void {
        HospitalPatientImportResult::create([
            'batch_id' => $this->importBatchId,
            'hospital_patient_id' => $hospitalPatientId,
            'hospital_id' => $hospitalId,
            'outcome' => $outcome,
            'patient_id' => $patientId,
            'message' => $message,
        ]);
    }
}
