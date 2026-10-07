<?php

namespace App\Http\Docs\Schemas;

use OpenApi\Attributes as OA;

/**
 * Response shapes for the read-only reference lookups (sectors, assistant types,
 * intervention types, guarantors, watcher relationship types) and the MSWD
 * classification matrix.
 */
#[OA\Schema(
    schema: 'Sector',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'name', type: 'string'),
        new OA\Property(property: 'code', type: 'string', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'AssistantType',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'name', type: 'string'),
        new OA\Property(property: 'code', type: 'string', nullable: true),
        new OA\Property(property: 'category', type: 'string', nullable: true),
        new OA\Property(property: 'category_label', type: 'string', nullable: true),
        new OA\Property(property: 'description', type: 'string', nullable: true),
        new OA\Property(property: 'is_active', type: 'boolean'),
        new OA\Property(property: 'usage_count', type: 'integer', description: 'Assistance records plus guarantee breakdown lines.'),
        new OA\Property(property: 'usage', properties: [
            new OA\Property(property: 'assistance_records', type: 'integer'),
            new OA\Property(property: 'guarantee_lines', type: 'integer'),
        ], type: 'object'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'AssistantTypeRequest',
    required: ['name', 'code', 'category'],
    description: 'On update every field is optional. Name is unique among types that are not deleted; code is unique across all types.',
    properties: [
        new OA\Property(property: 'name', type: 'string', maxLength: 255),
        new OA\Property(property: 'code', type: 'string', maxLength: 64, pattern: '^[a-z0-9_]+$'),
        new OA\Property(property: 'category', type: 'string', enum: ['medical', 'food', 'financial', 'burial', 'transportation', 'others']),
        new OA\Property(property: 'description', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'is_active', type: 'boolean'),
    ],
)]
#[OA\Schema(
    schema: 'InterventionType',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'name', type: 'string'),
        new OA\Property(property: 'code', type: 'string', nullable: true),
        new OA\Property(property: 'description', type: 'string', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'Guarantor',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'name', type: 'string'),
        new OA\Property(property: 'address', type: 'string', nullable: true),
        new OA\Property(property: 'is_active', type: 'boolean'),
        new OA\Property(property: 'usage_count', type: 'integer', description: 'Patient guarantees plus assistance records that name this guarantor.'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'GuarantorRequest',
    required: ['name'],
    description: 'On update every field is optional. The name is unique among guarantors that are not deleted.',
    properties: [
        new OA\Property(property: 'name', type: 'string', maxLength: 255),
        new OA\Property(property: 'address', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'is_active', type: 'boolean'),
    ],
)]
#[OA\Schema(
    schema: 'AssessmentLookup',
    description: 'A mode of assistance or fund source. Assessments store `code`; guarantee breakdown lines store the fund source id.',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'name', type: 'string'),
        new OA\Property(property: 'code', type: 'string'),
        new OA\Property(property: 'is_active', type: 'boolean'),
        new OA\Property(property: 'sort_order', type: 'integer'),
        new OA\Property(property: 'requires_specify', type: 'boolean', description: 'Fund sources only: a breakdown line using it must say what it is.'),
        new OA\Property(property: 'usage_count', type: 'integer', description: 'Assessments plus guarantee breakdown lines.'),
        new OA\Property(property: 'usage', properties: [
            new OA\Property(property: 'assessments', type: 'integer'),
            new OA\Property(property: 'guarantee_lines', type: 'integer'),
        ], type: 'object'),
        new OA\Property(property: 'code_locked', type: 'boolean', description: 'True while an assessment stores the code.'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'AssessmentLookupRequest',
    required: ['name', 'code'],
    description: 'On update every field is optional. Name is unique among rows that are not deleted; code is unique across all rows, lowercase letters, numbers and underscores, and cannot change once an assessment stores it.',
    properties: [
        new OA\Property(property: 'name', type: 'string', maxLength: 255),
        new OA\Property(property: 'code', type: 'string', maxLength: 64, pattern: '^[a-z0-9_]+$'),
        new OA\Property(property: 'is_active', type: 'boolean'),
        new OA\Property(property: 'sort_order', type: 'integer', minimum: 0),
        new OA\Property(property: 'requires_specify', type: 'boolean', description: 'Fund sources only.'),
    ],
)]
#[OA\Schema(
    schema: 'WatcherRelationshipType',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'name', type: 'string'),
        new OA\Property(property: 'code', type: 'string', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'MswdClassificationMatrix',
    description: 'A row of the MSWD socioeconomic classification matrix.',
    type: 'object',
    additionalProperties: true,
)]
final class ReferenceSchema
{
    //
}
