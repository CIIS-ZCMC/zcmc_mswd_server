<?php

namespace App\Http\Docs\Schemas;

use OpenApi\Attributes as OA;

/**
 * Response body for a patient, mirroring App\Http\Resources\PatientResource.
 * The `*_count` and relation fields only appear when eager-loaded (show/profile).
 */
#[OA\Schema(
    schema: 'Patient',
    description: 'A patient master record.',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'sector_id', type: 'integer', nullable: true),
        new OA\Property(property: 'hospital_id', type: 'integer', nullable: true),
        new OA\Property(property: 'mswd_id', type: 'integer', nullable: true),
        new OA\Property(property: 'first_name', type: 'string', example: 'Juan'),
        new OA\Property(property: 'last_name', type: 'string', example: 'Dela Cruz'),
        new OA\Property(property: 'middle_name', type: 'string', nullable: true),
        new OA\Property(property: 'extension_name', type: 'string', nullable: true),
        new OA\Property(property: 'birthdate', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'estimated_age', type: 'integer', nullable: true),
        new OA\Property(property: 'sex', type: 'string', example: 'male'),
        new OA\Property(property: 'civil_status', type: 'string', nullable: true),
        new OA\Property(property: 'address', type: 'string', nullable: true),
        new OA\Property(property: 'barangay', type: 'string', nullable: true),
        new OA\Property(property: 'municipality', type: 'string', nullable: true),
        new OA\Property(property: 'province', type: 'string', nullable: true),
        new OA\Property(property: 'contact_number', type: 'string', nullable: true),
        new OA\Property(property: 'religion', type: 'string', nullable: true),
        new OA\Property(property: 'nationality', type: 'string', nullable: true),
        new OA\Property(property: 'place_of_birth', type: 'string', nullable: true),
        new OA\Property(property: 'permanent_address', type: 'string', nullable: true),
        new OA\Property(property: 'present_address', type: 'string', nullable: true),
        new OA\Property(property: 'educational_attainment', type: 'string', nullable: true),
        new OA\Property(property: 'occupation', type: 'string', nullable: true),
        new OA\Property(property: 'employer', type: 'string', nullable: true),
        new OA\Property(property: 'monthly_income', type: 'number', format: 'float', nullable: true),
        new OA\Property(property: 'archived_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'cases_count', type: 'integer', nullable: true),
        new OA\Property(property: 'patient_ids_count', type: 'integer', nullable: true),
        new OA\Property(property: 'family_members_count', type: 'integer', nullable: true),
        new OA\Property(property: 'watchers_count', type: 'integer', nullable: true),
        new OA\Property(property: 'documents_count', type: 'integer', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'PatientCollection',
    description: 'A paginated list of patients.',
    properties: [
        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Patient')),
        new OA\Property(property: 'links', ref: '#/components/schemas/PaginationLinks'),
        new OA\Property(property: 'meta', ref: '#/components/schemas/PaginationMeta'),
    ],
)]
#[OA\Schema(
    schema: 'PatientStoreRequest',
    description: 'Create-patient request body (App\\Http\\Requests\\StorePatientRequest).',
    required: ['sector_id', 'first_name', 'last_name', 'sex'],
    properties: [
        new OA\Property(property: 'sector_id', type: 'integer', description: 'Existing sector id.'),
        new OA\Property(property: 'hospital_id', type: 'integer', nullable: true, description: 'Unique HIS id.'),
        new OA\Property(property: 'mswd_id', type: 'integer', nullable: true, description: 'Unique MSWD id.'),
        new OA\Property(property: 'first_name', type: 'string', maxLength: 255),
        new OA\Property(property: 'last_name', type: 'string', maxLength: 255),
        new OA\Property(property: 'middle_name', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'extension_name', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'birthdate', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'estimated_age', type: 'integer', nullable: true),
        new OA\Property(property: 'sex', type: 'string', maxLength: 255),
        new OA\Property(property: 'civil_status', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'address', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'barangay', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'municipality', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'province', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'contact_number', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'religion', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'nationality', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'place_of_birth', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'permanent_address', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'present_address', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'educational_attainment', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'occupation', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'employer', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'monthly_income', type: 'number', format: 'float', minimum: 0, nullable: true),
    ],
)]
final class PatientSchema
{
    //
}
