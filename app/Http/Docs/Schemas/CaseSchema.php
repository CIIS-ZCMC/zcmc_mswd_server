<?php

namespace App\Http\Docs\Schemas;

use OpenApi\Attributes as OA;

/**
 * Case and case-watcher response/request shapes, mirroring
 * App\Http\Resources\{CaseModel,CaseWatcher}Resource and the case form requests.
 */
#[OA\Schema(
    schema: 'Case',
    description: 'A case record.',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'case_code', type: 'string', nullable: true),
        new OA\Property(property: 'patient_id', type: 'integer'),
        new OA\Property(property: 'assigned_user_id', type: 'integer', nullable: true),
        new OA\Property(property: 'created_by', type: 'integer', nullable: true),
        new OA\Property(property: 'case_type', type: 'string'),
        new OA\Property(property: 'priority_level', type: 'string'),
        new OA\Property(property: 'status', type: 'string'),
        new OA\Property(property: 'admission_type', type: 'string', nullable: true),
        new OA\Property(property: 'transaction_id', type: 'integer', nullable: true, description: 'HIS encounter (psPatRegisters PK) this case was opened for.'),
        new OA\Property(property: 'transaction_type', type: 'string', nullable: true, description: 'Encounter transaction-type label, snapshotted at open.'),
        new OA\Property(property: 'card_color', type: 'string', enum: ['white', 'green', 'orange', 'pink'], nullable: true),
        new OA\Property(property: 'date_opened', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'date_closed', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'patient', ref: '#/components/schemas/Patient', nullable: true),
        new OA\Property(property: 'assigned_user', type: 'object', nullable: true, properties: [
            new OA\Property(property: 'id', type: 'integer'),
            new OA\Property(property: 'name', type: 'string'),
        ]),
        new OA\Property(property: 'created_by_user', type: 'object', nullable: true, properties: [
            new OA\Property(property: 'id', type: 'integer'),
            new OA\Property(property: 'name', type: 'string'),
        ]),
        new OA\Property(property: 'activities_count', type: 'integer', nullable: true),
        new OA\Property(property: 'assessments_count', type: 'integer', nullable: true),
        new OA\Property(property: 'diagnostics_count', type: 'integer', nullable: true),
        new OA\Property(property: 'interventions_count', type: 'integer', nullable: true),
        new OA\Property(property: 'documents_count', type: 'integer', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'CaseCollection',
    properties: [
        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Case')),
        new OA\Property(property: 'links', ref: '#/components/schemas/PaginationLinks'),
        new OA\Property(property: 'meta', ref: '#/components/schemas/PaginationMeta'),
    ],
)]
#[OA\Schema(
    schema: 'CaseStoreRequest',
    required: ['patient_id', 'case_type', 'priority_level'],
    properties: [
        new OA\Property(property: 'patient_id', type: 'integer'),
        new OA\Property(property: 'assigned_user_id', type: 'integer', nullable: true),
        new OA\Property(property: 'case_type', type: 'string', maxLength: 255),
        new OA\Property(property: 'priority_level', type: 'string', maxLength: 255),
        new OA\Property(property: 'admission_type', type: 'string', maxLength: 255, nullable: true, description: 'Required unless transaction_id is given, from which it is snapshotted.'),
        new OA\Property(property: 'transaction_id', type: 'integer', nullable: true, description: 'HIS encounter (psPatRegisters PK) to open the case for.'),
        new OA\Property(property: 'transaction_type', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'card_color', type: 'string', enum: ['white', 'green', 'orange', 'pink'], nullable: true),
        new OA\Property(property: 'status', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'date_opened', type: 'string', format: 'date', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'AssignCaseRequest',
    required: ['assigned_user_id'],
    properties: [
        new OA\Property(property: 'assigned_user_id', type: 'integer'),
    ],
)]
#[OA\Schema(
    schema: 'CaseWatcher',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'case_id', type: 'integer'),
        new OA\Property(property: 'patient_watcher_id', type: 'integer', nullable: true),
        new OA\Property(property: 'name', type: 'string'),
        new OA\Property(property: 'relationship', type: 'string', nullable: true),
        new OA\Property(property: 'contact_number', type: 'string', nullable: true),
        new OA\Property(property: 'address', type: 'string', nullable: true),
        new OA\Property(property: 'is_primary', type: 'boolean'),
        new OA\Property(property: 'is_informant', type: 'boolean'),
        new OA\Property(property: 'pass_number', type: 'string', nullable: true),
        new OA\Property(property: 'pass_valid_until', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'pass_status', type: 'string', nullable: true),
        new OA\Property(property: 'present_from', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'present_until', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'notes', type: 'string', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'CaseWatcherStoreRequest',
    description: 'Either link an existing patient_watcher_id or supply an inline person (name + relationship code).',
    properties: [
        new OA\Property(property: 'patient_watcher_id', type: 'integer', nullable: true),
        new OA\Property(property: 'name', type: 'string', maxLength: 255, description: 'Required without patient_watcher_id.'),
        new OA\Property(property: 'relationship', type: 'string', description: 'Watcher relationship type code. Required without patient_watcher_id.'),
        new OA\Property(property: 'contact_number', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'address', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'is_primary', type: 'boolean'),
        new OA\Property(property: 'is_informant', type: 'boolean'),
        new OA\Property(property: 'present_from', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'present_until', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'notes', type: 'string', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'CaseWatcherUpdateRequest',
    properties: [
        new OA\Property(property: 'name', type: 'string', maxLength: 255),
        new OA\Property(property: 'relationship', type: 'string', description: 'Watcher relationship type code.'),
        new OA\Property(property: 'contact_number', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'address', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'is_informant', type: 'boolean'),
        new OA\Property(property: 'present_from', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'present_until', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'notes', type: 'string', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'WatcherWaiverRequest',
    required: ['watcher_waiver_reason'],
    properties: [
        new OA\Property(property: 'watcher_waiver_reason', type: 'string', enum: ['unidentified_patient', 'abandoned', 'unaccompanied', 'patient_refused', 'under_protective_custody', 'other']),
        new OA\Property(property: 'watcher_waiver_note', type: 'string', nullable: true, description: 'Required when reason is "other".'),
    ],
)]
#[OA\Schema(
    schema: 'WatcherStatus',
    description: 'The watcher-requirement status banner for a case.',
    type: 'object',
    properties: [
        new OA\Property(property: 'requirement', type: 'string', enum: ['required', 'recommended', 'optional', 'waived']),
        new OA\Property(property: 'has_primary', type: 'boolean'),
        new OA\Property(property: 'satisfied', type: 'boolean'),
        new OA\Property(property: 'blocking', type: 'boolean'),
        new OA\Property(
            property: 'waiver',
            description: 'The filed-waiver detail, or null when the case has no explicit waiver (a legacy-exempt case is waived but carries no waiver record).',
            type: 'object',
            nullable: true,
            properties: [
                new OA\Property(property: 'reason', type: 'string'),
                new OA\Property(property: 'note', type: 'string', nullable: true),
                new OA\Property(property: 'waived_by', type: 'string', nullable: true, description: 'Resolved name of the section head who filed the waiver.'),
                new OA\Property(property: 'waived_by_id', type: 'integer', nullable: true),
                new OA\Property(property: 'waived_at', type: 'string', format: 'date-time', nullable: true),
            ],
        ),
    ],
    additionalProperties: true,
)]
#[OA\Schema(
    schema: 'CaseActivity',
    description: 'A case activity-timeline entry (assignment, transfer, etc.).',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'case_id', type: 'integer'),
        new OA\Property(property: 'assigned_user_id', type: 'integer', nullable: true),
        new OA\Property(property: 'previous_user_id', type: 'integer', nullable: true),
        new OA\Property(property: 'activity_type', type: 'string'),
        new OA\Property(property: 'activity_date', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'notes', type: 'string', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
final class CaseSchema
{
    //
}
