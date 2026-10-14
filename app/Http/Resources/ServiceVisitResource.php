<?php

namespace App\Http\Resources;

use App\Models\ServiceVisit;
use App\Models\User;
use App\Services\DarReportService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One timed MSWD visit, with its turnaround durations in whole minutes. Open
 * stages count up to now.
 *
 * @mixin ServiceVisit
 */
class ServiceVisitResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'patient_id' => $this->patient_id,
            'his_transaction_id' => $this->his_transaction_id,
            'status' => $this->status,
            'purpose' => $this->purpose,
            'remarks' => $this->remarks,
            'arrived_at' => $this->arrived_at,
            'started_at' => $this->started_at,
            'completed_at' => $this->completed_at,
            'cancelled_at' => $this->cancelled_at,
            'cancel_reason' => $this->cancel_reason,
            'waiting_minutes' => $this->waitingMinutes(),
            'processing_minutes' => $this->processingMinutes(),
            'total_minutes' => $this->totalMinutes(),
            'received_by' => $this->whenLoaded('receivedBy', fn () => self::user($this->receivedBy)),
            'served_by' => $this->whenLoaded('servedBy', fn () => self::user($this->servedBy)),
            'completed_by' => $this->whenLoaded('completedBy', fn () => self::user($this->completedBy)),
            'cancelled_by' => $this->whenLoaded('cancelledBy', fn () => self::user($this->cancelledBy)),
            'patient' => $this->whenLoaded('patient', fn () => $this->patient === null
                ? null
                : app(DarReportService::class)->patient($this->patient, $this->arrived_at)),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    /** @return array{id: int, name: string|null}|null */
    private static function user(?User $user): ?array
    {
        return $user === null ? null : ['id' => $user->id, 'name' => $user->employee_name ?? $user->email];
    }
}
