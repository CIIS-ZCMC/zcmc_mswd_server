<?php

namespace App\Http\Docs\Schemas;

use OpenApi\Attributes as OA;

/**
 * Response and request shapes for the patient sub-records: IDs, family members,
 * watchers, caretakers, documents and merge records.
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
        new OA\Property(property: 'name', type: 'string', description: 'The composed full name, e.g. "Maria L. Reyes".'),
        new OA\Property(property: 'last_name', type: 'string', nullable: true),
        new OA\Property(property: 'first_name', type: 'string', nullable: true),
        new OA\Property(property: 'middle_name', type: 'string', nullable: true),
        new OA\Property(property: 'relationship_code', type: 'string', nullable: true, description: 'A watcher relationship type code.'),
        new OA\Property(property: 'relationship_label', type: 'string', nullable: true, description: 'The relationship type name, e.g. "Barangay Official".'),
        new OA\Property(property: 'relationship', type: 'string', nullable: true, description: 'Same as relationship_label; kept for older clients.'),
        new OA\Property(property: 'contact_number', type: 'string', nullable: true),
        new OA\Property(property: 'address', type: 'string', nullable: true),
        new OA\Property(property: 'notes', type: 'string', nullable: true),
        new OA\Property(
            property: 'assignments',
            type: 'array',
            description: 'The cases this watcher is assigned to. Present when they were loaded.',
            items: new OA\Items(properties: [
                new OA\Property(property: 'id', type: 'integer', description: 'The case watcher id.'),
                new OA\Property(property: 'case_id', type: 'integer'),
                new OA\Property(property: 'case_code', type: 'string', nullable: true),
                new OA\Property(property: 'case_status', type: 'string', nullable: true),
                new OA\Property(property: 'is_primary', type: 'boolean'),
                new OA\Property(property: 'is_informant', type: 'boolean'),
                new OA\Property(property: 'pass_number', type: 'string', nullable: true),
                new OA\Property(property: 'pass_status', type: 'string', nullable: true),
            ]),
        ),
        new OA\Property(property: 'is_primary', type: 'boolean', description: 'True when primary on any assigned case. Present with assignments.'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'PatientWatcherRequest',
    description: "A patient's watcher. patient_id cannot be changed on update.",
    required: ['last_name', 'first_name', 'relationship_code', 'contact_number', 'address'],
    properties: [
        new OA\Property(property: 'last_name', type: 'string', maxLength: 255),
        new OA\Property(property: 'first_name', type: 'string', maxLength: 255),
        new OA\Property(property: 'middle_name', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'relationship_code', type: 'string', description: 'A watcher relationship type code.'),
        new OA\Property(property: 'contact_number', type: 'string', maxLength: 255),
        new OA\Property(property: 'address', type: 'string', maxLength: 255),
        new OA\Property(property: 'notes', type: 'string', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'PatientCaretaker',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'patient_id', type: 'integer'),
        new OA\Property(property: 'user_id', type: 'integer'),
        new OA\Property(property: 'role', type: 'string'),
        new OA\Property(property: 'assigned_date', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'unassigned_date', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'is_active', type: 'boolean'),
        new OA\Property(property: 'reason', type: 'string', nullable: true),
        new OA\Property(property: 'unassigned_reason', type: 'string', nullable: true),
        new OA\Property(property: 'replaced_by_id', type: 'integer', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'PatientCaretakerRequest',
    required: ['user_id', 'role', 'assigned_date'],
    properties: [
        new OA\Property(property: 'user_id', type: 'integer'),
        new OA\Property(property: 'role', type: 'string', maxLength: 255),
        new OA\Property(property: 'assigned_date', type: 'string', format: 'date'),
        new OA\Property(property: 'unassigned_date', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'is_active', type: 'boolean'),
        new OA\Property(property: 'reason', type: 'string', maxLength: 255, nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'ReassignCaretakerRequest',
    required: ['user_id'],
    properties: [
        new OA\Property(property: 'user_id', type: 'integer'),
        new OA\Property(property: 'reason', type: 'string', maxLength: 255, nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'Document',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'case_id', type: 'integer', nullable: true),
        new OA\Property(property: 'patient_id', type: 'integer', nullable: true),
        new OA\Property(property: 'intervention_id', type: 'integer', nullable: true),
        new OA\Property(property: 'uploaded_by', type: 'integer', nullable: true),
        new OA\Property(property: 'document_type', type: 'string'),
        new OA\Property(property: 'file_name', type: 'string'),
        new OA\Property(property: 'file_path', type: 'string'),
        new OA\Property(property: 'file_type', type: 'string'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'DocumentRequest',
    required: ['case_id', 'patient_id', 'uploaded_by', 'document_type', 'file_name', 'file_path', 'file_type'],
    properties: [
        new OA\Property(property: 'case_id', type: 'integer'),
        new OA\Property(property: 'patient_id', type: 'integer'),
        new OA\Property(property: 'intervention_id', type: 'integer', nullable: true),
        new OA\Property(property: 'uploaded_by', type: 'integer'),
        new OA\Property(property: 'document_type', type: 'string', maxLength: 255),
        new OA\Property(property: 'file_name', type: 'string', maxLength: 255),
        new OA\Property(property: 'file_path', type: 'string', maxLength: 255),
        new OA\Property(property: 'file_type', type: 'string', maxLength: 255),
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
