<?php

namespace App\Http\Docs\Schemas;

use OpenApi\Attributes as OA;

/**
 * A single activity-log entry, mirroring App\Http\Resources\ActivityResource
 * (spatie/laravel-activitylog). Shared by the audit log and the per-record
 * history endpoints.
 */
#[OA\Schema(
    schema: 'Activity',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'log_name', type: 'string', nullable: true),
        new OA\Property(property: 'event', type: 'string', nullable: true),
        new OA\Property(property: 'description', type: 'string', nullable: true),
        new OA\Property(property: 'subject_type', type: 'string', nullable: true),
        new OA\Property(property: 'subject_id', type: 'integer', nullable: true),
        new OA\Property(property: 'patient_id', type: 'integer', nullable: true),
        new OA\Property(property: 'case_id', type: 'integer', nullable: true),
        new OA\Property(property: 'subject_label', type: 'string', nullable: true),
        new OA\Property(property: 'causer', type: 'object', nullable: true, properties: [
            new OA\Property(property: 'id', type: 'integer'),
            new OA\Property(property: 'name', type: 'string'),
        ]),
        new OA\Property(property: 'changes', type: 'object', nullable: true, additionalProperties: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
final class ActivitySchema
{
    //
}
