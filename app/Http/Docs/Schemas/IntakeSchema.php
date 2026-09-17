<?php

namespace App\Http\Docs\Schemas;

use OpenApi\Attributes as OA;

/**
 * Response and request shapes for the unified intake sheet, mirroring
 * App\Http\Resources\UnifiedIntakeSheetResource and StoreUnifiedIntakeSheetRequest.
 */
#[OA\Schema(
    schema: 'IntakeSheet',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'intake_no', type: 'string', nullable: true),
        new OA\Property(property: 'status', type: 'string'),
        new OA\Property(property: 'referral_source', type: 'string', nullable: true),
        new OA\Property(property: 'referral_details', type: 'string', nullable: true),
        new OA\Property(property: 'date_of_intake', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'remarks', type: 'string', nullable: true),
        new OA\Property(property: 'patient_id', type: 'integer', nullable: true),
        new OA\Property(property: 'case_id', type: 'integer', nullable: true),
        new OA\Property(property: 'assessment_id', type: 'integer', nullable: true),
        new OA\Property(property: 'intake_worker_id', type: 'integer', nullable: true),
        new OA\Property(property: 'submitted_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'finalized_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'finalized_by', type: 'integer', nullable: true),
        new OA\Property(property: 'patient', ref: '#/components/schemas/Patient', nullable: true),
        new OA\Property(property: 'case', ref: '#/components/schemas/Case', nullable: true),
        new OA\Property(property: 'assessment', ref: '#/components/schemas/Assessment', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'IntakeSheetCollection',
    properties: [
        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/IntakeSheet')),
        new OA\Property(property: 'links', ref: '#/components/schemas/PaginationLinks'),
        new OA\Property(property: 'meta', ref: '#/components/schemas/PaginationMeta'),
    ],
)]
#[OA\Schema(
    schema: 'IntakeSheetRequest',
    description: 'The unified intake payload: header, patient (reuse patient_id OR create a new patient object), optional sub-records, case (case_id OR new case), optional assessment, recommended assistances and expenses. See StoreUnifiedIntakeSheetRequest for the full field set.',
    properties: [
        new OA\Property(property: 'referral_source', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'referral_details', type: 'string', nullable: true),
        new OA\Property(property: 'date_of_intake', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'remarks', type: 'string', nullable: true),
        new OA\Property(property: 'patient_id', type: 'integer', nullable: true, description: 'Required without `patient`.'),
        new OA\Property(property: 'patient', type: 'object', nullable: true, description: 'A new patient (required without patient_id).', additionalProperties: true),
        new OA\Property(property: 'patient_ids', type: 'array', items: new OA\Items(type: 'object', additionalProperties: true)),
        new OA\Property(property: 'family_members', type: 'array', items: new OA\Items(type: 'object', additionalProperties: true)),
        new OA\Property(property: 'watchers', type: 'array', items: new OA\Items(type: 'object', additionalProperties: true)),
        new OA\Property(property: 'case_id', type: 'integer', nullable: true, description: 'Required without `case`.'),
        new OA\Property(property: 'case', type: 'object', nullable: true, description: 'A new case (required without case_id).', additionalProperties: true),
        new OA\Property(property: 'assessment', type: 'object', nullable: true, additionalProperties: true),
        new OA\Property(property: 'assistances', type: 'array', items: new OA\Items(type: 'object', additionalProperties: true)),
        new OA\Property(property: 'expenses', type: 'array', items: new OA\Items(type: 'object', additionalProperties: true)),
    ],
)]
final class IntakeSchema
{
    //
}
