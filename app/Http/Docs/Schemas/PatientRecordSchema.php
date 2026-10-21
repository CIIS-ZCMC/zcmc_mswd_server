<?php

namespace App\Http\Docs\Schemas;

use OpenApi\Attributes as OA;

/**
 * Response and request shapes for the patient sub-records: IDs, family members,
 * watchers, documents and merge records.
 */
#[OA\Schema(
    schema: 'PatientId',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'patient_id', type: 'integer'),
        new OA\Property(property: 'id_type', type: 'string'),
        new OA\Property(property: 'id_number', type: 'string'),
        new OA\Property(property: 'date_issued', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'date_expiry', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'is_verified', type: 'boolean'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'PatientIdRequest',
    required: ['id_type', 'id_number'],
    properties: [
        new OA\Property(property: 'id_type', type: 'string', maxLength: 255),
        new OA\Property(property: 'id_number', type: 'string', maxLength: 255),
        new OA\Property(property: 'date_issued', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'date_expiry', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'is_verified', type: 'boolean'),
    ],
)]
#[OA\Schema(
    schema: 'PatientFamilyMember',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'patient_id', type: 'integer'),
        new OA\Property(property: 'name', type: 'string'),
        new OA\Property(property: 'relationship', type: 'string', nullable: true),
        new OA\Property(property: 'birthdate', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'sex', type: 'string', nullable: true),
        new OA\Property(property: 'civil_status', type: 'string', nullable: true),
        new OA\Property(property: 'age', type: 'integer', nullable: true),
        new OA\Property(property: 'occupation', type: 'string', nullable: true),
        new OA\Property(property: 'monthly_income', type: 'number', format: 'float', nullable: true),
        new OA\Property(property: 'educational_attainment', type: 'string', nullable: true),
        new OA\Property(property: 'contact_number', type: 'string', nullable: true),
        new OA\Property(property: 'is_living_with_patient', type: 'boolean'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'PatientFamilyMemberRequest',
    required: ['name'],
    properties: [
        new OA\Property(property: 'name', type: 'string', maxLength: 255),
        new OA\Property(property: 'relationship', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'birthdate', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'sex', type: 'string', maxLength: 20, nullable: true),
        new OA\Property(property: 'civil_status', type: 'string', nullable: true),
        new OA\Property(property: 'age', type: 'integer', nullable: true),
        new OA\Property(property: 'occupation', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'monthly_income', type: 'number', format: 'float', nullable: true),
        new OA\Property(property: 'educational_attainment', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'contact_number', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'is_living_with_patient', type: 'boolean'),
    ],
)]
#[OA\Schema(
    schema: 'PatientWatcher',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'patient_id', type: 'integer'),
        new OA\Property(property: 'name', type: 'string'),
        new OA\Property(property: 'relationship', type: 'string', nullable: true),
        new OA\Property(property: 'contact_number', type: 'string', nullable: true),
        new OA\Property(property: 'address', type: 'string', nullable: true),
        new OA\Property(property: 'is_primary', type: 'boolean'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'PatientWatcherRequest',
    required: ['contact_number', 'address', 'relationship_code'],
    properties: [
        new OA\Property(property: 'name', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'first_name', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'middle_name', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'last_name', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'relationship_code', type: 'string', maxLength: 255),
        new OA\Property(property: 'contact_number', type: 'string', maxLength: 255),
        new OA\Property(property: 'address', type: 'string', maxLength: 255),
        new OA\Property(property: 'notes', type: 'string', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'Document',
    description: 'An uploaded file. Read it through `file_url`; the storage path is not exposed.',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'case_id', type: 'integer', nullable: true),
        new OA\Property(property: 'patient_id', type: 'integer'),
        new OA\Property(property: 'intervention_id', type: 'integer', nullable: true),
        new OA\Property(property: 'uploaded_by', type: 'integer', nullable: true),
        new OA\Property(property: 'uploaded_by_name', type: 'string', nullable: true, description: 'Present when the uploader is loaded.'),
        new OA\Property(property: 'case_code', type: 'string', nullable: true, description: 'Present when the case is loaded.'),
        new OA\Property(property: 'document_type_id', type: 'integer', nullable: true),
        new OA\Property(property: 'document_type', type: 'string', description: 'The type name at upload time.'),
        new OA\Property(property: 'file_name', type: 'string'),
        new OA\Property(property: 'file_type', type: 'string'),
        new OA\Property(property: 'file_size', type: 'integer', nullable: true, description: 'Bytes; null on uploads from before sizes were kept.'),
        new OA\Property(property: 'file_url', type: 'string', description: 'GET to view; add `?download=1` to save.'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'DocumentRequest',
    description: 'Multipart upload.',
    required: ['document_type_id', 'file'],
    properties: [
        new OA\Property(property: 'document_type_id', type: 'integer', description: 'An active Library document type.'),
        new OA\Property(property: 'case_id', type: 'integer', nullable: true, description: 'One of the patient\'s cases.'),
        new OA\Property(property: 'file', type: 'string', format: 'binary', description: 'pdf, jpg, jpeg or png; max 10 MB.'),
    ],
)]
#[OA\Schema(
    schema: 'PatientMerge',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'source_patient_id', type: 'integer'),
        new OA\Property(property: 'target_patient_id', type: 'integer'),
        new OA\Property(property: 'moved_counts', type: 'object', additionalProperties: new OA\AdditionalProperties(type: 'integer')),
        new OA\Property(property: 'performed_by', type: 'integer', nullable: true),
        new OA\Property(property: 'reversed_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'reversed_by', type: 'integer', nullable: true),
        new OA\Property(property: 'is_reversed', type: 'boolean'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'MergePatientRequest',
    required: ['target_id'],
    properties: [
        new OA\Property(property: 'target_id', type: 'integer', description: 'The surviving patient the source merges into.'),
    ],
)]
final class PatientRecordSchema
{
    //
}
