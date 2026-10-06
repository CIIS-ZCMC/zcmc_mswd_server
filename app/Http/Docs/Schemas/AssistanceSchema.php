<?php

namespace App\Http\Docs\Schemas;

use OpenApi\Attributes as OA;

/**
 * Response and request shapes for patient assistance, its lifecycle logs and
 * released-aid report snapshots.
 */
#[OA\Schema(
    schema: 'Assistance',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'case_id', type: 'integer'),
        new OA\Property(property: 'assistant_type_id', type: 'integer'),
        new OA\Property(property: 'assistant_type', type: 'string', nullable: true),
        new OA\Property(property: 'guarantor_id', type: 'integer', nullable: true),
        new OA\Property(property: 'guarantor', type: 'string', nullable: true),
        new OA\Property(property: 'amount', type: 'number', format: 'float', nullable: true),
        new OA\Property(property: 'notes', type: 'string', nullable: true),
        new OA\Property(property: 'date_given', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'created_by', type: 'integer', nullable: true),
        new OA\Property(property: 'status', type: 'string'),
        new OA\Property(property: 'logs', type: 'array', items: new OA\Items(ref: '#/components/schemas/AssistanceLog')),
        new OA\Property(property: 'reports', type: 'array', items: new OA\Items(ref: '#/components/schemas/AssistanceReport')),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'AssistanceRequest',
    required: ['assistant_type_id'],
    properties: [
        new OA\Property(property: 'assistant_type_id', type: 'integer'),
        new OA\Property(property: 'guarantor_id', type: 'integer', nullable: true),
        new OA\Property(property: 'amount', type: 'number', format: 'float', minimum: 0, nullable: true),
        new OA\Property(property: 'notes', type: 'string', nullable: true),
        new OA\Property(property: 'date_given', type: 'string', format: 'date', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'AssistanceLog',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'assistance_id', type: 'integer'),
        new OA\Property(property: 'status', type: 'string', nullable: true),
        new OA\Property(property: 'action', type: 'string', nullable: true),
        new OA\Property(property: 'action_by', type: 'integer', nullable: true),
        new OA\Property(property: 'action_date', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'AssistanceReport',
    description: 'A released-aid report snapshot.',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'assistance_id', type: 'integer'),
        new OA\Property(property: 'hospital_id', type: 'integer', nullable: true),
        new OA\Property(property: 'mswd_id', type: 'integer', nullable: true),
        new OA\Property(property: 'patient_name', type: 'string', nullable: true),
        new OA\Property(property: 'patient_address', type: 'string', nullable: true),
        new OA\Property(property: 'assistant_type', type: 'string', nullable: true),
        new OA\Property(property: 'category', type: 'string', nullable: true),
        new OA\Property(property: 'amount', type: 'number', format: 'float', nullable: true),
        new OA\Property(property: 'snapshot_json', type: 'object', nullable: true, additionalProperties: true),
        new OA\Property(property: 'released_by', type: 'integer', nullable: true),
        new OA\Property(property: 'released_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'is_void', type: 'boolean'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'AssistanceSource',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'name', type: 'string'),
        new OA\Property(property: 'code', type: 'string', nullable: true),
        new OA\Property(property: 'requires_specify', type: 'boolean'),
        new OA\Property(property: 'is_active', type: 'boolean'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'PatientGuarantee',
    description: 'An MSWD patient guarantor on one hospital encounter. `total` is the sum of `items`.',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'patient_id', type: 'integer'),
        new OA\Property(property: 'his_transaction_id', type: 'integer'),
        new OA\Property(property: 'hospital_id', type: 'integer', nullable: true),
        new OA\Property(property: 'guarantor', properties: [
            new OA\Property(property: 'id', type: 'integer'),
            new OA\Property(property: 'name', type: 'string'),
        ], type: 'object', nullable: true),
        new OA\Property(property: 'reference_no', type: 'string', nullable: true),
        new OA\Property(property: 'guaranteed_on', type: 'string', format: 'date'),
        new OA\Property(property: 'remarks', type: 'string', nullable: true),
        new OA\Property(property: 'items', type: 'array', items: new OA\Items(properties: [
            new OA\Property(property: 'id', type: 'integer'),
            new OA\Property(property: 'source', properties: [
                new OA\Property(property: 'id', type: 'integer'),
                new OA\Property(property: 'name', type: 'string'),
                new OA\Property(property: 'requires_specify', type: 'boolean'),
            ], type: 'object', nullable: true),
            new OA\Property(property: 'others_specify', type: 'string', nullable: true),
            new OA\Property(property: 'amount', type: 'number', format: 'float'),
        ], type: 'object')),
        new OA\Property(property: 'total', type: 'number', format: 'float'),
        new OA\Property(property: 'recorded_by', properties: [
            new OA\Property(property: 'id', type: 'integer'),
            new OA\Property(property: 'name', type: 'string', nullable: true),
        ], type: 'object', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'PatientGuaranteeRequest',
    required: ['his_transaction_id', 'guarantor_id', 'guaranteed_on', 'items'],
    description: 'On update every field is optional and `his_transaction_id` is prohibited.',
    properties: [
        new OA\Property(property: 'his_transaction_id', type: 'integer'),
        new OA\Property(property: 'guarantor_id', type: 'integer'),
        new OA\Property(property: 'reference_no', type: 'string', nullable: true),
        new OA\Property(property: 'guaranteed_on', type: 'string', format: 'date'),
        new OA\Property(property: 'remarks', type: 'string', nullable: true),
        new OA\Property(property: 'items', type: 'array', minItems: 1, items: new OA\Items(
            required: ['assistance_source_id', 'amount'],
            properties: [
                new OA\Property(property: 'assistance_source_id', type: 'integer'),
                new OA\Property(property: 'amount', type: 'number', format: 'float', minimum: 0.01),
                new OA\Property(property: 'others_specify', type: 'string', nullable: true),
            ],
            type: 'object',
        )),
    ],
)]
final class AssistanceSchema
{
    //
}
