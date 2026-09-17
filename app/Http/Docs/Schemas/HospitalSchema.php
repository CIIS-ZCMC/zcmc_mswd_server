<?php

namespace App\Http\Docs\Schemas;

use OpenApi\Attributes as OA;

/**
 * Response shapes for the read-only hospital information system (HIS) lookups,
 * mirroring App\Http\Resources\{HospitalPatient,PatientTransaction,PatientGuarantor}Resource.
 * The HIS schema is translated, so unknown columns are omitted rather than guessed.
 */
#[OA\Schema(
    schema: 'HospitalPatient',
    description: 'A patient record from the hospital information system.',
    properties: [
        new OA\Property(property: 'id', type: 'string'),
        new OA\Property(property: 'hospital_number', type: 'string', nullable: true),
        new OA\Property(property: 'display_name', type: 'string', nullable: true),
        new OA\Property(property: 'personal_data', type: 'object', nullable: true, additionalProperties: true, description: 'Mapped personal-data block (present on the aggregate show only).'),
        new OA\Property(property: 'transactions', type: 'array', items: new OA\Items(ref: '#/components/schemas/PatientTransaction'), description: 'Present on the aggregate show only.'),
    ],
)]
#[OA\Schema(
    schema: 'PatientTransaction',
    description: 'A hospital encounter (transaction).',
    properties: [
        new OA\Property(property: 'id', type: 'string'),
        new OA\Property(property: 'patient', ref: '#/components/schemas/HospitalPatient', nullable: true),
        new OA\Property(property: 'patient_name', type: 'string', nullable: true),
        new OA\Property(property: 'hospital_number', type: 'string', nullable: true),
        new OA\Property(property: 'guarantors', type: 'array', items: new OA\Items(ref: '#/components/schemas/PatientGuarantor'), description: 'Present on find() only.'),
    ],
)]
#[OA\Schema(
    schema: 'PatientGuarantor',
    description: 'A guarantor ledger row from the HIS.',
    properties: [
        new OA\Property(property: 'id', type: 'string'),
        new OA\Property(property: 'registration_id', type: 'string', nullable: true),
        new OA\Property(property: 'guarantor_id', type: 'string', nullable: true),
        new OA\Property(property: 'guarantor_name', type: 'string', nullable: true),
    ],
)]
final class HospitalSchema
{
    //
}
